/**
 * Site diary readers for the Performance Site Diary and Dunsteel Subcontractors
 * Diary databases (both Project 411).
 */
import {
  queryDataSource,
  getTitle,
  getRichText,
  getDate,
  getSelect,
  getMultiSelect,
  getNumber,
  getCheckbox,
  getCreatedTime,
} from "./helpers"

export type DiaryEntry = {
  id: string
  title: string
  date: string | null
  workCompleted: string
  weather: string | null
  finishTime: string | null
  hoursLost: number | null
  crewOnsite: number | null
  crewNames: string[]
  notes: string
  safetyIncident: boolean
  builderDelays: boolean
  source: "performance" | "subcon"
  status?: string | null
  invoiced?: string | null
  url?: string
  createdAt?: string
}

function performanceDb(): string {
  const id = process.env.NOTION_PERFORMANCE_DIARY_DB
  if (!id) throw new Error("NOTION_PERFORMANCE_DIARY_DB not set")
  return id
}

function subconDb(): string {
  const id = process.env.NOTION_SUBCON_DIARY_DB
  if (!id) throw new Error("NOTION_SUBCON_DIARY_DB not set")
  return id
}

function todayIso(): string {
  return new Date().toLocaleDateString("en-CA", { timeZone: "Australia/Sydney" })
}

function mapEntry(
  page: { id: string; properties: Record<string, unknown>; url?: string; created_time?: string },
  source: "performance" | "subcon",
): DiaryEntry {
  const props = page.properties
  return {
    id: page.id,
    title: getTitle(props) || `(no title)`,
    date: getDate(props, "Date") ?? getDate(props, "date"),
    workCompleted: getRichText(props, "Work Completed") || getRichText(props, "Work completed") || getRichText(props, "Work"),
    weather: getSelect(props, "Weather"),
    finishTime: getRichText(props, "Finish Time") || getRichText(props, "Finish time") || null,
    hoursLost: getNumber(props, "Hours Lost") ?? getNumber(props, "Hours lost"),
    crewOnsite: getNumber(props, "Crew Onsite") ?? getNumber(props, "Crew onsite"),
    crewNames: source === "subcon" ? getMultiSelect(props, "Crew") : [],
    notes: getRichText(props, "Notes"),
    safetyIncident: getCheckbox(props, "Safety Incidents") || getCheckbox(props, "Safety Incident"),
    builderDelays: getCheckbox(props, "Builder Delays") || getCheckbox(props, "Builder Delay"),
    source,
    status: getSelect(props, "Status"),
    invoiced: getSelect(props, "Status") ?? getSelect(props, "Invoiced"),
    url: page.url,
    createdAt: page.created_time ?? getCreatedTime(props) ?? undefined,
  }
}

export async function getDiaryEntriesForDate(opts?: {
  date?: string
  limit?: number
}): Promise<DiaryEntry[]> {
  const date = opts?.date ?? todayIso()
  const filter = {
    property: "Date",
    date: { equals: date },
  }
  const [perf, sub] = await Promise.allSettled([
    queryDataSource({ databaseId: performanceDb(), filter, pageSize: opts?.limit ?? 25 }),
    queryDataSource({ databaseId: subconDb(), filter, pageSize: opts?.limit ?? 25 }),
  ])
  const out: DiaryEntry[] = []
  if (perf.status === "fulfilled") for (const p of perf.value) out.push(mapEntry(p, "performance"))
  if (sub.status === "fulfilled") for (const p of sub.value) out.push(mapEntry(p, "subcon"))
  out.sort((a, b) => (b.createdAt ?? "").localeCompare(a.createdAt ?? ""))
  return out
}

export async function getRecentDiaryEntries(limit = 10): Promise<DiaryEntry[]> {
  const sorts = [{ timestamp: "created_time", direction: "descending" } as const]
  const [perf, sub] = await Promise.allSettled([
    queryDataSource({ databaseId: performanceDb(), sorts, pageSize: limit }),
    queryDataSource({ databaseId: subconDb(), sorts, pageSize: limit }),
  ])
  const out: DiaryEntry[] = []
  if (perf.status === "fulfilled") for (const p of perf.value) out.push(mapEntry(p, "performance"))
  if (sub.status === "fulfilled") for (const p of sub.value) out.push(mapEntry(p, "subcon"))
  out.sort((a, b) => (b.createdAt ?? "").localeCompare(a.createdAt ?? ""))
  return out.slice(0, limit)
}

export async function getDiaryFlaggedEntries(opts?: { days?: number }): Promise<DiaryEntry[]> {
  const days = opts?.days ?? 7
  const since = new Date(Date.now() - days * 86400_000).toISOString().slice(0, 10)
  const filter = {
    and: [
      { property: "Date", date: { on_or_after: since } },
      {
        or: [
          { property: "Safety Incidents", checkbox: { equals: true } },
          { property: "Builder Delays", checkbox: { equals: true } },
        ],
      },
    ],
  }
  const results: DiaryEntry[] = []
  for (const [dbName, dbId] of [
    ["performance", performanceDb()],
    ["subcon", subconDb()],
  ] as const) {
    try {
      const rows = await queryDataSource({ databaseId: dbId, filter, pageSize: 25 })
      for (const r of rows) results.push(mapEntry(r, dbName))
    } catch {
      // Some DBs may not have these properties; ignore
    }
  }
  return results
}

export async function getDiaryEntriesThisWeek(): Promise<DiaryEntry[]> {
  const today = new Date()
  const dayOfWeek = today.getDay() // 0=Sun, 1=Mon...
  const monday = new Date(today)
  monday.setDate(today.getDate() - (dayOfWeek === 0 ? 6 : dayOfWeek - 1))
  const mondayIso = monday.toLocaleDateString("en-CA", { timeZone: "Australia/Sydney" })
  const todayIsoStr = today.toLocaleDateString("en-CA", { timeZone: "Australia/Sydney" })
  const filter = {
    and: [
      { property: "Date", date: { on_or_after: mondayIso } },
      { property: "Date", date: { on_or_before: todayIsoStr } },
    ],
  }
  const sorts = [{ property: "Date", direction: "descending" } as const]
  const [perf, sub] = await Promise.allSettled([
    queryDataSource({ databaseId: performanceDb(), filter, sorts, pageSize: 30 }),
    queryDataSource({ databaseId: subconDb(), filter, sorts, pageSize: 30 }),
  ])
  const out: DiaryEntry[] = []
  if (perf.status === "fulfilled") for (const p of perf.value) out.push(mapEntry(p, "performance"))
  if (sub.status === "fulfilled") for (const p of sub.value) out.push(mapEntry(p, "subcon"))
  out.sort((a, b) => (b.date ?? "").localeCompare(a.date ?? ""))
  return out
}

export async function getUninvoicedSubconEntries(limit = 50): Promise<DiaryEntry[]> {
  const filter = {
    property: "Status",
    status: { equals: "Not Invoiced" },
  }
  try {
    const rows = await queryDataSource({ databaseId: subconDb(), filter, pageSize: limit })
    return rows.map((r) => mapEntry(r, "subcon"))
  } catch {
    // try `select` instead of `status` field type
    try {
      const rows = await queryDataSource({
        databaseId: subconDb(),
        filter: { property: "Status", select: { equals: "Not Invoiced" } } as Record<string, unknown>,
        pageSize: limit,
      })
      return rows.map((r) => mapEntry(r, "subcon"))
    } catch {
      return []
    }
  }
}
