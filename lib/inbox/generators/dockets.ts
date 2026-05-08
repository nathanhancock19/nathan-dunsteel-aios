/**
 * Inbox generator: today's submitted dockets awaiting review.
 *
 * Reads from Airtable Day Docket App. Surfaces a single rolled-up item
 * with the count, not one row per docket (avoids list bloat when the
 * day's dockets are 5+).
 */

import { getTodayDockets } from "@/lib/airtable"
import type { InboxItem } from "../types"

export async function generateDocketItems(): Promise<InboxItem[]> {
  let dockets
  try {
    dockets = await getTodayDockets()
  } catch {
    return []
  }

  if (!dockets || dockets.length === 0) return []

  return [
    {
      id: `docket-app:today:${new Date().toISOString().slice(0, 10)}`,
      source: "docket-app",
      urgency: "today",
      title: `${dockets.length} docket${dockets.length === 1 ? "" : "s"} submitted today`,
      context: "Day Docket App",
      actions: [
        { label: "Review", href: "/projects", variant: "primary" },
      ],
      raw: { count: dockets.length },
    },
  ]
}
