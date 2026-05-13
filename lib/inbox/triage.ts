/**
 * Inbox triage layer.
 *
 * Given the raw inbox items from runInbox(), ask Claude to score each one
 * `high | medium | drop` with a one-line reason, conditioned on a context
 * bundle of current 411 project state.
 *
 * Mutates items in place: each item gets a `.triage` field set.
 *
 * Best-effort: if Claude is unreachable or returns malformed output, items
 * keep `.triage = null` and the UI falls back to showing everything tier-
 * grouped by urgency (the pre-Phase-2 behaviour).
 */

import Anthropic from "@anthropic-ai/sdk"
import { getClaude } from "@/lib/claude/client"
import { getRecentSiteDiaryEntries, getHighPriorityNotes } from "@/lib/notion"
import { getNcrAnalytics } from "@/lib/drive/ncr-analytics"
import { listVariations } from "@/lib/airtable/variations"
import { sydneyTodayIso } from "@/lib/utils/today"
import type { InboxItem, TriageScore } from "./types"

const TRIAGE_MODEL = process.env.AIOS_TRIAGE_MODEL ?? "claude-haiku-4-5-20251001"
const TRIAGE_MAX_TOKENS = 1500
const CONTEXT_TTL_MS = 5 * 60_000

type ContextBundle = {
  today: string
  diary: string
  notes: string
  defects: string
  variations: string
}

let _contextCache: { bundle: ContextBundle; expiresAt: number } | null = null

async function buildContextBundle(): Promise<ContextBundle> {
  const project = process.env.AIOS_PRIMARY_PROJECT_NUMBER
  const today = sydneyTodayIso()

  const [diaryResult, notesResult, defectsResult, varsResult] = await Promise.allSettled([
    getRecentSiteDiaryEntries(3),
    project ? getHighPriorityNotes(project) : Promise.resolve([]),
    getNcrAnalytics(),
    listVariations({ status: "Open" }),
  ])

  const diary =
    diaryResult.status === "fulfilled" && diaryResult.value.length > 0
      ? diaryResult.value
          .map((e) => `- ${e.date ?? "(no date)"}: ${(e.title ?? "").slice(0, 80)}`)
          .join("\n")
      : "(no recent diary entries)"

  const notes =
    notesResult.status === "fulfilled" && notesResult.value.length > 0
      ? notesResult.value
          .slice(0, 10)
          .map((n) => `- [${n.category ?? "general"}] ${n.title.slice(0, 80)}`)
          .join("\n")
      : "(no open high-priority notes)"

  let defects = "(defects analytics unavailable)"
  if (defectsResult.status === "fulfilled") {
    const a = defectsResult.value
    const topCats = a.byCategory.slice(0, 3).map((c) => `${c.name}=${c.count}`).join(", ")
    const topLvls = a.byLevel.slice(0, 3).map((l) => `${l.name}=${l.count}`).join(", ")
    defects = `${a.total} total. Top categories: ${topCats || "(none)"}. Top levels: ${topLvls || "(none)"}.`
  }

  const variations =
    varsResult.status === "fulfilled" && varsResult.value.length > 0
      ? varsResult.value
          .slice(0, 10)
          .map((v) => `- ${v.variationNumber || v.id}: ${(v.title ?? "").slice(0, 80)}`)
          .join("\n")
      : "(no open variations)"

  return { today, diary, notes, defects, variations }
}

async function getContextBundle(): Promise<ContextBundle> {
  if (_contextCache && _contextCache.expiresAt > Date.now()) {
    return _contextCache.bundle
  }
  const bundle = await buildContextBundle()
  _contextCache = { bundle, expiresAt: Date.now() + CONTEXT_TTL_MS }
  return bundle
}

function buildSystemPrompt(): string {
  return `You are a triage assistant for Nathan Hancock, the Project Coordinator on Dunsteel's flagship Project 411 (AW Edwards, Air Trunk SYD2, Lane Cove).

You receive a list of inbox items pulled from his systems (Monday POs, deliveries, site diary state, day dockets, Outlook flagged emails). Score each item:

- "high": needs Nathan's attention TODAY. Ties to active 411 work, an open variation, an overdue delivery, a flagged email from a key stakeholder (Zac Liddle at AW Edwards, Marjorie at Dunsteel, Ian at AW Edwards, Josh Dunlop, Performance Cranes leads).
- "medium": relevant this week but not today. Useful but not blocking. Collapsed by default on dashboard.
- "drop": informational, FYI, automated notification, or already represented by another inbox item. Hidden by default.

Reason: one line, max 12 words. Plain language, no fluff. Tell Nathan WHY this score, not what the item is. Examples:
- "Ties to open variation V-23 awaiting AWE response."
- "Auto-notification, no action needed."
- "Same supplier already on a different PO row today."

Australian English. No em dashes (use hyphen, colon, or restructure).

Return ONLY a JSON array of {id, score, reason} objects. No prose, no markdown fences, no explanation.`
}

function buildUserPrompt(items: InboxItem[], ctx: ContextBundle): string {
  const itemList = items.map((i) => {
    const stripped = {
      id: i.id,
      source: i.source,
      urgency: i.urgency,
      title: i.title,
      context: i.context ?? null,
    }
    return JSON.stringify(stripped)
  })

  return `# Context — 411 Project State (as of ${ctx.today})

## Recent diary entries
${ctx.diary}

## Open high-priority notes
${ctx.notes}

## NCR / defects
${ctx.defects}

## Open variations
${ctx.variations}

# Inbox items to score

${itemList.join("\n")}

Return a JSON array, one entry per item. Every id above must appear exactly once.`
}

type ClaudeTriageResult = { id: string; score: TriageScore["score"]; reason: string }

function parseTriageJson(raw: string): ClaudeTriageResult[] | null {
  // Strip code fences if Claude wrapped despite instructions.
  let text = raw.trim()
  if (text.startsWith("```")) {
    text = text.replace(/^```(?:json)?\s*/i, "").replace(/```\s*$/i, "")
  }
  try {
    const parsed = JSON.parse(text)
    if (!Array.isArray(parsed)) return null
    return parsed.filter(
      (x): x is ClaudeTriageResult =>
        x &&
        typeof x.id === "string" &&
        (x.score === "high" || x.score === "medium" || x.score === "drop") &&
        typeof x.reason === "string",
    )
  } catch {
    return null
  }
}

/**
 * Score every item in place. No-op if items is empty.
 *
 * Throws if Claude is unreachable; the caller should swallow so triage
 * stays best-effort and the inbox keeps working.
 */
export async function triageInboxItems(items: InboxItem[]): Promise<void> {
  if (items.length === 0) return

  // Initialise all items to null so the UI knows triage was attempted.
  for (const item of items) {
    item.triage = item.triage ?? null
  }

  const ctx = await getContextBundle()
  const client = getClaude()

  const response = await client.messages.create({
    model: TRIAGE_MODEL,
    max_tokens: TRIAGE_MAX_TOKENS,
    temperature: 0.2,
    system: [
      {
        type: "text",
        text: buildSystemPrompt(),
        cache_control: { type: "ephemeral" } as Anthropic.CacheControlEphemeral,
      },
    ],
    messages: [
      {
        role: "user",
        content: buildUserPrompt(items, ctx),
      },
    ],
  } as Anthropic.MessageCreateParamsNonStreaming)

  const textBlock = response.content.find((b) => b.type === "text") as
    | Anthropic.TextBlock
    | undefined
  if (!textBlock) return

  const parsed = parseTriageJson(textBlock.text)
  if (!parsed) {
    console.warn("[triage] failed to parse Claude output")
    return
  }

  const byId = new Map(parsed.map((p) => [p.id, p]))
  for (const item of items) {
    const t = byId.get(item.id)
    if (t) {
      item.triage = { score: t.score, reason: t.reason }
    }
  }
}

/** Drop the cached context bundle; next triage call re-pulls. */
export function clearTriageContextCache(): void {
  _contextCache = null
}
