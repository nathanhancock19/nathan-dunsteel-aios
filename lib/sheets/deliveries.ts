/**
 * Google Sheets reader for the Dunsteel delivery schedule.
 *
 * The sheet (DELIVERY_SCHEDULE_SHEET_ID) is a horizontal Gantt:
 *  - Columns are dates (Mar 16 to Dec 15, banded by month)
 *  - Rows are grouped into "Job 1" through "Job 5" blocks per day
 *  - Each Job block has Project / Details / Truck / Time / SIGNED rows
 *
 * We forward-fill the month band, locate the column for a given date,
 * then read each Job block's attribute rows at that column.
 */

import { parse } from "csv-parse/sync"
import { sydneyToday, sydneyTodayIso } from "@/lib/utils/today"

const DEFAULT_SHEET_ID = "1_IKGGCq2R7Dbs7N5glN3-DmgAYrG-Edt8XI7u8kKDDU"

export type DeliveryJob = {
  jobIndex: number
  project: string
  details: string
  truck?: string
  time?: string
  signedDocket?: string
  contact?: string
  pm?: string
  status?: string
  notes?: string
}

export type DeliveriesForDay = {
  date: string // YYYY-MM-DD
  monthLabel: string // e.g. "May"
  dayName: string // e.g. "Friday"
  jobs: DeliveryJob[]
}

const MONTH_NAMES = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
]

const ATTR_LABELS: Record<string, keyof DeliveryJob> = {
  Project: "project",
  Details: "details",
  Truck: "truck",
  Time: "time",
  "SIGNED Delivery Docket Y/N": "signedDocket",
  "Delivery Docket Y/N": "signedDocket",
  Contact: "contact",
  PM: "pm",
  Status: "status",
  "Notes or Delivery Docket": "notes",
}

async function fetchCsv(sheetId: string): Promise<string[][]> {
  const url = `https://docs.google.com/spreadsheets/d/${sheetId}/export?format=csv`
  const res = await fetch(url, { cache: "no-store" })
  if (!res.ok) throw new Error(`Sheet fetch failed: HTTP ${res.status}`)
  const csv = await res.text()
  return parse(csv, { relax_column_count: true, skip_empty_lines: false }) as string[][]
}

function forwardFillMonths(monthRow: string[]): string[] {
  const out: string[] = []
  let last = ""
  for (let i = 0; i < monthRow.length; i++) {
    const v = String(monthRow[i] ?? "").trim()
    if (MONTH_NAMES.includes(v)) last = v
    out[i] = last
  }
  return out
}

function findColumnForDate(
  rows: string[][],
  isoDate: string,
): { colIdx: number; monthLabel: string; dayName: string } | null {
  const monthRow = rows[2] ?? []
  const dateRow = rows[3] ?? []
  const dayRow = rows[4] ?? []
  const filledMonths = forwardFillMonths(monthRow)
  const target = new Date(isoDate + "T12:00:00") // use noon to avoid DST edge cases
  if (Number.isNaN(target.getTime())) return null
  const wantedMonth = MONTH_NAMES[target.getMonth()]
  const wantedDay = String(target.getDate())

  for (let c = 1; c < dateRow.length; c++) {
    if (
      filledMonths[c] === wantedMonth &&
      String(dateRow[c] ?? "").trim() === wantedDay
    ) {
      return {
        colIdx: c,
        monthLabel: wantedMonth,
        dayName: String(dayRow[c] ?? "").trim(),
      }
    }
  }
  return null
}

function extractJobsForColumn(
  rows: string[][],
  colIdx: number,
  projectFilter?: string,
): DeliveryJob[] {
  const jobs: DeliveryJob[] = []
  let current: DeliveryJob | null = null
  for (const row of rows) {
    const label = String(row[0] ?? "").trim().replace(/\s+$/, "")
    const jobMatch = label.match(/^Job\s+(\d+)/i)
    if (jobMatch) {
      if (current && (current.project || current.details)) jobs.push(current)
      current = { jobIndex: Number(jobMatch[1]), project: "", details: "" }
      continue
    }
    if (!current) continue
    const attrKey = ATTR_LABELS[label]
    if (attrKey) {
      const cell = String(row[colIdx] ?? "").trim()
      if (cell) (current as DeliveryJob)[attrKey] = cell as never
    }
  }
  if (current && (current.project || current.details)) jobs.push(current)

  let filtered = jobs.filter((j) => j.project || j.details)
  if (projectFilter) {
    const needle = projectFilter.toLowerCase()
    filtered = filtered.filter((j) => j.project.toLowerCase().includes(needle))
  }
  return filtered
}

function todayISO(): string {
  return sydneyTodayIso()
}

/**
 * Fetch deliveries scheduled for the given date. Optionally filter to a
 * project number (e.g., "411").
 */
export async function getDeliveriesForDay(opts?: {
  date?: string
  projectFilter?: string
  sheetId?: string
}): Promise<DeliveriesForDay> {
  const date = opts?.date ?? todayISO()
  const sheetId = opts?.sheetId ?? process.env.DELIVERY_SCHEDULE_SHEET_ID ?? DEFAULT_SHEET_ID
  const rows = await fetchCsv(sheetId)
  const located = findColumnForDate(rows, date)
  if (!located) return { date, monthLabel: "", dayName: "", jobs: [] }
  const { colIdx, monthLabel, dayName } = located
  const jobs = extractJobsForColumn(rows, colIdx, opts?.projectFilter)
  return { date, monthLabel, dayName, jobs }
}

/**
 * Fetch deliveries for today + next 6 days (7 days total). Fetches the sheet
 * once and extracts each date column. Days with no deliveries are included
 * with an empty jobs array so callers can show a full week view.
 */
export async function getDeliveriesForWeek(opts?: {
  projectFilter?: string
  sheetId?: string
}): Promise<DeliveriesForDay[]> {
  const sheetId = opts?.sheetId ?? process.env.DELIVERY_SCHEDULE_SHEET_ID ?? DEFAULT_SHEET_ID
  const rows = await fetchCsv(sheetId)
  const results: DeliveriesForDay[] = []

  // 7 days starting today, in Sydney calendar order. Using sydneyToday()
  // keeps the loop aligned to Sydney midnight regardless of server TZ.
  const t = sydneyToday()
  const startIso = t.isoDate
  const [startY, startM, startD] = startIso.split("-").map(Number)
  for (let i = 0; i < 7; i++) {
    const d = new Date(Date.UTC(startY, startM - 1, startD + i, 2, 0, 0))
    const date = d.toLocaleDateString("en-CA", { timeZone: "Australia/Sydney" })
    const located = findColumnForDate(rows, date)
    if (!located) {
      results.push({ date, monthLabel: "", dayName: "", jobs: [] })
      continue
    }
    const { colIdx, monthLabel, dayName } = located
    const jobs = extractJobsForColumn(rows, colIdx, opts?.projectFilter)
    results.push({ date, monthLabel, dayName, jobs })
  }

  return results
}

/**
 * Fetch deliveries for Mon-Sun of the current Sydney week.
 *
 * Differs from getDeliveriesForWeek: that returns "today + 6"; this returns
 * "this calendar week". Used by the dashboard DeliveriesCard so the strip
 * is stable through the week instead of rolling each day.
 */
export async function getDeliveriesForCurrentWeek(opts?: {
  projectFilter?: string
  sheetId?: string
}): Promise<DeliveriesForDay[]> {
  const sheetId = opts?.sheetId ?? process.env.DELIVERY_SCHEDULE_SHEET_ID ?? DEFAULT_SHEET_ID
  const rows = await fetchCsv(sheetId)
  const results: DeliveriesForDay[] = []

  const t = sydneyToday()
  for (const date of t.weekDaysIso) {
    const located = findColumnForDate(rows, date)
    if (!located) {
      results.push({ date, monthLabel: "", dayName: "", jobs: [] })
      continue
    }
    const { colIdx, monthLabel, dayName } = located
    const jobs = extractJobsForColumn(rows, colIdx, opts?.projectFilter)
    results.push({ date, monthLabel, dayName, jobs })
  }

  return results
}
