/**
 * Inbox runner — invokes all generators in parallel and stitches results
 * into a single ordered list.
 *
 * Sort order: now > today > this-week, then by createdAt desc within tier.
 *
 * Generators that throw or return [] do not block the others. Each
 * generator's failure is silently swallowed so a single misconfigured
 * source can't kill the whole inbox.
 *
 * Phase 1.3 additions:
 *  - Per-generator timing logged when total runtime > SLOW_THRESHOLD_MS.
 *  - 60s in-memory cache keyed by generator name; cache hit returns
 *    cached batch without hitting the upstream.
 *  - Triage scoring (Phase 2) is applied after batches merge.
 */

import type { InboxItem, InboxUrgency } from "./types"
import { generateMondayPOItems } from "./generators/monday-po"
import { generateDeliveryItems } from "./generators/sheets-delivery"
import { generateDiaryItems } from "./generators/notion-diary"
import { generateDocketItems } from "./generators/dockets"
import { generateOutlookItems } from "./generators/outlook"
import { triageInboxItems } from "./triage"
import { sydneyTodayIso } from "@/lib/utils/today"

export type { InboxItem, InboxItemAction, InboxItemState, InboxSource, InboxUrgency, TriageScore } from "./types"

const URGENCY_ORDER: Record<InboxUrgency, number> = {
  now: 0,
  today: 1,
  "this-week": 2,
}

const SLOW_THRESHOLD_MS = 3000
const CACHE_TTL_MS = 60_000

type CacheEntry = { items: InboxItem[]; expiresAt: number }
const generatorCache = new Map<string, CacheEntry>()

function withTimeout<T>(promise: Promise<T>, ms: number): Promise<T> {
  return Promise.race([
    promise,
    new Promise<never>((_, reject) =>
      setTimeout(() => reject(new Error(`timeout after ${ms}ms`)), ms),
    ),
  ])
}

type GeneratorRun = {
  name: string
  fn: () => Promise<InboxItem[]>
  /** Generators known to be slow get longer timeouts + cache priority. */
  cacheable?: boolean
  timeoutMs?: number
}

type RunResult = {
  name: string
  durationMs: number
  status: "ok" | "error" | "timeout" | "cache-hit"
  count: number
  error?: string
}

async function safeRun(g: GeneratorRun): Promise<{ items: InboxItem[]; result: RunResult }> {
  const start = Date.now()
  const cache = g.cacheable ? generatorCache.get(g.name) : undefined
  if (cache && cache.expiresAt > Date.now()) {
    return {
      items: cache.items,
      result: {
        name: g.name,
        durationMs: Date.now() - start,
        status: "cache-hit",
        count: cache.items.length,
      },
    }
  }
  const timeoutMs = g.timeoutMs ?? 8000
  try {
    const items = await withTimeout(g.fn(), timeoutMs)
    if (g.cacheable) {
      generatorCache.set(g.name, { items, expiresAt: Date.now() + CACHE_TTL_MS })
    }
    return {
      items,
      result: {
        name: g.name,
        durationMs: Date.now() - start,
        status: "ok",
        count: items.length,
      },
    }
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err)
    return {
      items: [],
      result: {
        name: g.name,
        durationMs: Date.now() - start,
        status: msg.startsWith("timeout") ? "timeout" : "error",
        count: 0,
        error: msg,
      },
    }
  }
}

export async function runInbox(opts?: { triage?: boolean }): Promise<InboxItem[]> {
  const triageOn = opts?.triage !== false // default ON
  const overallStart = Date.now()

  const generators: GeneratorRun[] = [
    { name: "monday-po", fn: generateMondayPOItems, cacheable: true, timeoutMs: 8000 },
    { name: "sheets-delivery", fn: generateDeliveryItems, cacheable: true, timeoutMs: 6000 },
    { name: "notion-diary", fn: generateDiaryItems, cacheable: true, timeoutMs: 6000 },
    { name: "dockets", fn: generateDocketItems, cacheable: true, timeoutMs: 6000 },
    { name: "outlook", fn: generateOutlookItems, cacheable: true, timeoutMs: 8000 },
  ]

  const batches = await Promise.all(generators.map(safeRun))
  const overallMs = Date.now() - overallStart

  // Log per-generator timing when the whole run is slow. Picks up the
  // offender for the "5-10s inbox load" diagnosis from the prior bundle.
  if (overallMs > SLOW_THRESHOLD_MS) {
    const summary = batches
      .map((b) => `${b.result.name}=${b.result.durationMs}ms(${b.result.status},${b.result.count})`)
      .join(" ")
    console.warn(`[inbox] slow run total=${overallMs}ms ${summary}`)
  }

  const all = batches.flatMap((b) => b.items)

  all.sort((a, b) => {
    const ua = URGENCY_ORDER[a.urgency]
    const ub = URGENCY_ORDER[b.urgency]
    if (ua !== ub) return ua - ub
    if (a.createdAt && b.createdAt) {
      return b.createdAt.localeCompare(a.createdAt)
    }
    return a.id.localeCompare(b.id)
  })

  if (triageOn && all.length > 0) {
    try {
      await triageInboxItems(all)
    } catch (err) {
      // Triage is best-effort. If Claude is unreachable, items stay
      // unscored and the UI falls back to showing everything.
      console.warn(`[inbox] triage failed: ${err instanceof Error ? err.message : String(err)}`)
    }
  }

  return all
}

/**
 * Drop all cached generator output. Called by /api/sync/all to force a
 * fresh pull on the next runInbox().
 */
export function clearInboxCache(): void {
  generatorCache.clear()
}

/** For debugging: expose what's cached and when each expires. */
export function inboxCacheState(): Array<{ name: string; ageMs: number; ttlMs: number; itemCount: number }> {
  const now = Date.now()
  return Array.from(generatorCache.entries()).map(([name, entry]) => ({
    name,
    ageMs: now - (entry.expiresAt - CACHE_TTL_MS),
    ttlMs: Math.max(0, entry.expiresAt - now),
    itemCount: entry.items.length,
  }))
}

/** Build a Sydney-date-aware cache key prefix for future bucket-by-day caches. */
export function dailyKeyPrefix(): string {
  return sydneyTodayIso()
}
