/**
 * Decision log: append-only record of actions taken through AIOS.
 *
 * If POSTGRES_URL is not set, all writes no-op silently; reads return
 * empty arrays. This keeps the app working before a DB is provisioned.
 *
 * Categories used by AIOS code:
 *  - po-approval         a PO was approved (with optional allocation)
 *  - po-allocation       allocation set without approval
 *  - inbox-snooze        an inbox item was snoozed
 *  - inbox-done          an inbox item was marked done
 *  - inbox-waiting       an inbox item was marked waiting on someone
 *  - assistant-tool-call assistant invoked a write tool (with confirm)
 *  - note                free-form note from chat or UI
 */

import { getDb } from "@/lib/db/postgres"

export type DecisionRow = {
  id: string
  occurredAt: string
  actor: "nathan" | "assistant"
  category: string
  subject: string | null
  body: Record<string, unknown>
  sourceId: string | null
}

export type LogInput = {
  actor: "nathan" | "assistant"
  category: string
  subject?: string
  body: Record<string, unknown>
  sourceId?: string
}

export async function logDecision(input: LogInput): Promise<{ ok: boolean }> {
  const db = getDb()
  if (!db) return { ok: false }
  try {
    await db`
      insert into decisions (actor, category, subject, body, source_id)
      values (
        ${input.actor},
        ${input.category},
        ${input.subject ?? null},
        ${JSON.stringify(input.body)}::jsonb,
        ${input.sourceId ?? null}
      )
    `
    return { ok: true }
  } catch (err) {
    console.error("[decisions] write failed:", err)
    return { ok: false }
  }
}

export async function recentDecisions(opts?: {
  days?: number
  limit?: number
  category?: string
  subject?: string
}): Promise<DecisionRow[]> {
  const db = getDb()
  if (!db) return []
  const days = opts?.days ?? 30
  const limit = opts?.limit ?? 50
  try {
    let rows: Array<{
      id: string
      occurred_at: Date
      actor: string
      category: string
      subject: string | null
      body: Record<string, unknown>
      source_id: string | null
    }>
    if (opts?.subject && opts?.category) {
      rows = await db`
        select id, occurred_at, actor, category, subject, body, source_id
        from decisions
        where occurred_at > now() - (${days} || ' days')::interval
          and category = ${opts.category}
          and subject = ${opts.subject}
        order by occurred_at desc
        limit ${limit}
      `
    } else if (opts?.subject) {
      rows = await db`
        select id, occurred_at, actor, category, subject, body, source_id
        from decisions
        where occurred_at > now() - (${days} || ' days')::interval
          and subject = ${opts.subject}
        order by occurred_at desc
        limit ${limit}
      `
    } else if (opts?.category) {
      rows = await db`
        select id, occurred_at, actor, category, subject, body, source_id
        from decisions
        where occurred_at > now() - (${days} || ' days')::interval
          and category = ${opts.category}
        order by occurred_at desc
        limit ${limit}
      `
    } else {
      rows = await db`
        select id, occurred_at, actor, category, subject, body, source_id
        from decisions
        where occurred_at > now() - (${days} || ' days')::interval
        order by occurred_at desc
        limit ${limit}
      `
    }
    return rows.map((r) => ({
      id: r.id,
      occurredAt: r.occurred_at.toISOString(),
      actor: r.actor as "nathan" | "assistant",
      category: r.category,
      subject: r.subject,
      body: r.body,
      sourceId: r.source_id,
    }))
  } catch (err) {
    console.error("[decisions] read failed:", err)
    return []
  }
}

/**
 * Supplier learning: given a supplier (PO subject), return the most
 * common (jobScopeId, costCodeLabel) pair from the last 90 days of
 * po-approval rows. Used by the PO card to pre-fill allocation.
 */
export async function suggestPOAllocation(supplier: string): Promise<{
  jobScopeId: number | null
  costCodeLabel: string | null
  confidence: number // 0..1 based on consistency of recent allocations
} | null> {
  const db = getDb()
  if (!db) return null
  try {
    const rows = await db<
      Array<{ body: { jobScopeId?: number; costCodeLabel?: string } }>
    >`
      select body
      from decisions
      where category = 'po-approval'
        and subject = ${supplier}
        and occurred_at > now() - interval '90 days'
      order by occurred_at desc
      limit 10
    `
    if (rows.length === 0) return null
    const tally: Record<string, number> = {}
    for (const r of rows) {
      const key = `${r.body.jobScopeId ?? "-"}::${r.body.costCodeLabel ?? "-"}`
      tally[key] = (tally[key] ?? 0) + 1
    }
    const entries = Object.entries(tally).sort((a, b) => b[1] - a[1])
    const top = entries[0]
    if (!top) return null
    const [keyTop, countTop] = top
    const [jsId, ccLabel] = keyTop.split("::")
    return {
      jobScopeId: jsId === "-" ? null : Number(jsId),
      costCodeLabel: ccLabel === "-" ? null : ccLabel,
      confidence: countTop / rows.length,
    }
  } catch (err) {
    console.error("[decisions] supplier learning failed:", err)
    return null
  }
}
