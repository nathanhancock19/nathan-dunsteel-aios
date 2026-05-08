/**
 * Helpers around the Day Dockets table for AIOS dashboard widgets.
 *
 * Reads only. Day Docket App owns the data; AIOS surfaces summaries.
 */

import { listRecords } from "./client"
import { TABLES } from "./schema"
import type { DayDocketFields } from "./types"
import type { Record as AirtableRecord, FieldSet } from "airtable"

function todayISO(): string {
  // Local-date YYYY-MM-DD. Airtable stores docket Date as a date-only string.
  const d = new Date()
  const tz = d.getTimezoneOffset() * 60000
  return new Date(d.getTime() - tz).toISOString().slice(0, 10)
}

export type TodayDocket = {
  id: string
  ref: string
  date: string
  status: string
  hourType: string
  projectIds: string[]
  companyIds: string[]
  workerEntryCount: number
}

function toTodayDocket(r: AirtableRecord<DayDocketFields & FieldSet>): TodayDocket {
  return {
    id: r.id,
    ref: String(r.fields["Docket Ref"] ?? ""),
    date: String(r.fields.Date ?? ""),
    status: String(r.fields.Status ?? ""),
    hourType: String(r.fields["Hour Type"] ?? ""),
    projectIds: Array.isArray(r.fields.Project) ? (r.fields.Project as string[]) : [],
    companyIds: Array.isArray(r.fields.Company) ? (r.fields.Company as string[]) : [],
    workerEntryCount: Array.isArray(r.fields["Worker Entries"])
      ? (r.fields["Worker Entries"] as string[]).length
      : 0,
  }
}

/**
 * Fetch all Day Dockets dated today.
 */
export async function getTodayDockets(): Promise<TodayDocket[]> {
  const today = todayISO()
  const records = await listRecords(TABLES.DAY_DOCKETS, {
    filterByFormula: `IS_SAME({Date}, "${today}", "day")`,
    fields: ["Docket Ref", "Project", "Company", "Status", "Date", "Hour Type", "Worker Entries"],
    maxRecords: 100,
  })
  return records.map(toTodayDocket)
}

export type TodaySiteActivity = {
  date: string
  totalDockets: number
  uniqueProjectIds: string[]
  uniqueCompanyIds: string[]
  totalWorkerEntries: number
}

export async function getTodaySiteActivity(): Promise<TodaySiteActivity> {
  const dockets = await getTodayDockets()
  const projects = new Set<string>()
  const companies = new Set<string>()
  let workers = 0
  for (const d of dockets) {
    d.projectIds.forEach((p) => projects.add(p))
    d.companyIds.forEach((c) => companies.add(c))
    workers += d.workerEntryCount
  }
  return {
    date: todayISO(),
    totalDockets: dockets.length,
    uniqueProjectIds: Array.from(projects),
    uniqueCompanyIds: Array.from(companies),
    totalWorkerEntries: workers,
  }
}
