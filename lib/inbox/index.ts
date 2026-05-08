/**
 * Inbox runner — invokes all generators in parallel and stitches results
 * into a single ordered list.
 *
 * Sort order: now > today > this-week, then by createdAt desc within tier.
 *
 * Generators that throw or return [] do not block the others. Each
 * generator's failure is silently swallowed so a single misconfigured
 * source can't kill the whole inbox.
 */

import type { InboxItem, InboxUrgency } from "./types"
import { generateMondayPOItems } from "./generators/monday-po"
import { generateDeliveryItems } from "./generators/sheets-delivery"
import { generateDiaryItems } from "./generators/notion-diary"
import { generateDocketItems } from "./generators/dockets"

export type { InboxItem, InboxItemAction, InboxItemState, InboxSource, InboxUrgency } from "./types"

const URGENCY_ORDER: Record<InboxUrgency, number> = {
  now: 0,
  today: 1,
  "this-week": 2,
}

async function safeRun(fn: () => Promise<InboxItem[]>): Promise<InboxItem[]> {
  try {
    return await fn()
  } catch {
    return []
  }
}

export async function runInbox(): Promise<InboxItem[]> {
  const batches = await Promise.all([
    safeRun(generateMondayPOItems),
    safeRun(generateDeliveryItems),
    safeRun(generateDiaryItems),
    safeRun(generateDocketItems),
  ])

  const all = batches.flat()

  all.sort((a, b) => {
    const ua = URGENCY_ORDER[a.urgency]
    const ub = URGENCY_ORDER[b.urgency]
    if (ua !== ub) return ua - ub
    if (a.createdAt && b.createdAt) {
      return b.createdAt.localeCompare(a.createdAt)
    }
    return a.id.localeCompare(b.id)
  })

  return all
}
