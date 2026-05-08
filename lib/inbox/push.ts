/**
 * Telegram push helpers for the inbox.
 *
 * Two flavours:
 *  - morning   one digest at 06:30 Sydney with the top NOW + TODAY items
 *  - threshold fires when a new NOW-tier item from a high-signal source
 *              lands between morning pushes
 *
 * Dedupe: an item that already fired a threshold push is NOT included in
 * that day's morning push. State lives in the push_history Postgres table
 * if available, otherwise pushes are best-effort and may duplicate.
 *
 * High-signal sources (threshold-eligible): monday-po, sheets-delivery
 * Low-signal sources (morning-only): notion-diary, docket-app
 */

import { runInbox } from "."
import type { InboxItem, InboxSource } from "./types"
import { notifyNathan } from "@/lib/telegram"
import { getDb } from "@/lib/db/postgres"

const HIGH_SIGNAL_SOURCES: InboxSource[] = ["monday-po", "sheets-delivery"]

const SOURCE_BADGE: Record<InboxSource, string> = {
  "monday-po": "PO",
  "sheets-delivery": "DELIVERY",
  "notion-diary": "DIARY",
  "docket-app": "DOCKET",
}

function dunsteelLink(): string {
  return process.env.NEXTAUTH_URL?.replace(/\/$/, "") ?? "https://nathan-dunsteel-aios.vercel.app"
}

async function alreadyPushed(itemId: string, withinMinutes = 1440): Promise<boolean> {
  const db = getDb()
  if (!db) return false
  try {
    const rows = await db<Array<{ count: number }>>`
      select count(*)::int as count
      from push_history
      where item_id = ${itemId}
        and sent_at > now() - (${withinMinutes} || ' minutes')::interval
    `
    return (rows[0]?.count ?? 0) > 0
  } catch {
    return false
  }
}

async function recordPush(itemId: string, type: "morning" | "threshold"): Promise<void> {
  const db = getDb()
  if (!db) return
  try {
    await db`
      insert into push_history (item_id, push_type)
      values (${itemId}, ${type})
    `
  } catch (err) {
    console.error("[push] recordPush failed:", err)
  }
}

function formatItem(i: InboxItem): string {
  const badge = SOURCE_BADGE[i.source]
  const ctx = i.context ? `\n   ${escape(i.context)}` : ""
  return `<b>[${badge}]</b> ${escape(i.title)}${ctx}`
}

function escape(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")
}

export async function sendMorningPush(): Promise<{
  sent: boolean
  itemCount: number
}> {
  const items = await runInbox()
  // Drop already-threshold-pushed items
  const fresh: InboxItem[] = []
  for (const i of items) {
    if (await alreadyPushed(i.id)) continue
    fresh.push(i)
  }
  const now = fresh.filter((i) => i.urgency === "now").slice(0, 5)
  const today = fresh.filter((i) => i.urgency === "today").slice(0, 3)

  const link = dunsteelLink()
  let body: string

  if (now.length === 0 && today.length === 0) {
    body = `<b>Morning brief</b>\nYou&apos;re clear.\n\n${link}/dashboard`
  } else {
    const lines = ["<b>Morning brief</b>"]
    if (now.length > 0) {
      lines.push("\n<b>NOW</b>")
      for (const i of now) lines.push(formatItem(i))
    }
    if (today.length > 0) {
      lines.push("\n<b>TODAY</b>")
      for (const i of today) lines.push(formatItem(i))
    }
    lines.push(`\n${link}/dashboard`)
    body = lines.join("\n")
  }

  try {
    await notifyNathan(body)
  } catch (err) {
    console.error("[push] morning failed:", err)
    return { sent: false, itemCount: now.length + today.length }
  }
  // Record what we pushed so threshold-push doesn't re-fire today.
  await Promise.all([...now, ...today].map((i) => recordPush(i.id, "morning")))
  return { sent: true, itemCount: now.length + today.length }
}

export async function sendThresholdPush(): Promise<{
  sent: boolean
  itemCount: number
}> {
  const items = await runInbox()
  // Only NOW-tier items from high-signal sources, that haven't been pushed today.
  const candidates: InboxItem[] = []
  for (const i of items) {
    if (i.urgency !== "now") continue
    if (!HIGH_SIGNAL_SOURCES.includes(i.source)) continue
    if (await alreadyPushed(i.id)) continue
    candidates.push(i)
  }

  if (candidates.length === 0) return { sent: false, itemCount: 0 }

  const link = dunsteelLink()
  const lines = ["<b>Heads up</b>"]
  for (const i of candidates.slice(0, 5)) lines.push(formatItem(i))
  lines.push(`\n${link}/dashboard`)

  try {
    await notifyNathan(lines.join("\n"))
  } catch (err) {
    console.error("[push] threshold failed:", err)
    return { sent: false, itemCount: candidates.length }
  }
  await Promise.all(candidates.map((i) => recordPush(i.id, "threshold")))
  return { sent: true, itemCount: candidates.length }
}
