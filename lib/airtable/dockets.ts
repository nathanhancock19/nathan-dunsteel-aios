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
  return new Date().toLocaleDateString("en-CA", { timeZone: "Australia/Sydney" })
}

/**
 * Build the Airtable filterByFormula clause for the configured primary
 * project. AIOS is currently single-project (411 Lane Cove); other PMs'
 * projects are filtered out at the data layer so they never reach the UI.
 *
 * If AIOS_PRIMARY_PROJECT_NUMBER is unset, no project filter is applied.
 */
function projectFilterClause(): string | null {
  const num = process.env.AIOS_PRIMARY_PROJECT_NUMBER
  if (!num) return null
  // ARRAYJOIN({Project}) returns the linked records' primary field text
  // (typically "411", "397", etc), so a substring match works.
  return `FIND("${num}", ARRAYJOIN({Project}, ","))`
}

function combineAnd(...clauses: (string | null | undefined)[]): string {
  const live = clauses.filter((c): c is string => Boolean(c))
  if (live.length === 0) return ""
  if (live.length === 1) return live[0]
  return `AND(${live.join(", ")})`
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
 * Fetch all Day Dockets dated today, scoped to the configured primary project.
 */
export async function getTodayDockets(): Promise<TodayDocket[]> {
  const today = todayISO()
  const formula = combineAnd(
    `IS_SAME({Date}, "${today}", "day")`,
    projectFilterClause(),
  )
  const records = await listRecords(TABLES.DAY_DOCKETS, {
    filterByFormula: formula,
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
