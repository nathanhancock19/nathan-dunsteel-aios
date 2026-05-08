/**
 * Inbox generator: yesterday's site diary entry missing.
 *
 * If the most recent diary entry is older than yesterday, surface a
 * "diary missing" inbox item.
 *
 * Single-project mode: assumes one active site. In multi-project mode
 * this would need to compare against an active-projects list.
 */

import { getRecentSiteDiaryEntries } from "@/lib/notion"
import type { InboxItem } from "../types"

function todayISO(): string {
  return new Date().toLocaleDateString("en-CA", { timeZone: "Australia/Sydney" })
}

function yesterdayISO(): string {
  const d = new Date()
  d.setDate(d.getDate() - 1)
  return d.toLocaleDateString("en-CA", { timeZone: "Australia/Sydney" })
}

export async function generateDiaryItems(): Promise<InboxItem[]> {
  if (!process.env.NOTION_SITE_DIARY_DATABASE_ID || !process.env.NOTION_API_KEY) {
    return []
  }

  let entries
  try {
    entries = await getRecentSiteDiaryEntries(3)
  } catch {
    return []
  }

  const yesterday = yesterdayISO()
  const today = todayISO()

  // Pull the latest entry's date (string-compare on ISO works).
  const latestDate = entries[0]?.date ?? entries[0]?.id
  const project = process.env.AIOS_PRIMARY_PROJECT_NUMBER

  // If we have an entry dated today or yesterday, no inbox item needed.
  if (entries[0]?.date === today || entries[0]?.date === yesterday) {
    return []
  }

  const projectLabel = project ? `Project ${project}` : "Site diary"
  return [
    {
      id: `notion-diary:missing:${yesterday}`,
      source: "notion-diary",
      urgency: "today",
      title: `${projectLabel} diary missing for ${yesterday}`,
      context: latestDate ? `Last entry: ${latestDate}` : "No recent entries",
      actions: [
        {
          label: "Open Notion",
          href: `https://notion.so/${(process.env.NOTION_SITE_DIARY_DATABASE_ID ?? "").replaceAll("-", "")}`,
          variant: "primary",
        },
      ],
      raw: { latestDate },
    },
  ]
}
