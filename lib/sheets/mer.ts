/**
 * MER (Monthly Earnings Report) reader.
 *
 * The MER is Nathan's manually-maintained Google Sheet tracking claims/revenue
 * per scope per month across all Dunsteel projects. Updated twice a month
 * after claims are submitted.
 *
 * Sheet structure (observed):
 *   Row 1 (headers): Job, Scope, Scope Value, Remaining Value, Claimed,
 *                    [Remaining Value, Claimed] x N months
 *   Subsequent rows: project header rows (sparse, only Job filled),
 *                    then scope rows for that project
 *   Variations appear as scope rows labelled "V01" through "V14"
 *   Empty/separator rows between projects
 *   Some cells contain "#DIV/0!" errors; we treat those as null
 *   Bottom row(s): totals
 *
 * Parsing strategy:
 *   1. Read row 1 to determine month columns
 *   2. Walk rows; track "current project" state from sparse Job-only rows
 *   3. For each scope row, emit one MerScope record + N MerClaim records
 *      (one per month)
 *   4. Skip totals/summary rows
 */
import { google } from "googleapis"
import { getGoogleAuth } from "@/lib/google/auth"

export type MerScope = {
  id: string                    // "{project}::{scope}"
  projectNumber: string
  projectLabel: string          // e.g. "411 SYD2"
  scopeName: string
  scopeValue: number | null
  remainingValue: number | null
  claimedPct: number | null     // 0..1
  isVariation: boolean
}

export type MerClaim = {
  id: string                    // "{project}::{scope}::{yearmonth}"
  projectNumber: string
  scopeName: string
  yearMonth: string             // "2026-04"
  remainingValue: number | null
  claimedPct: number | null     // 0..1
}

export type MerData = {
  generatedAt: string
  scopes: MerScope[]
  claims: MerClaim[]
  monthsObserved: string[]      // ["2026-04", "2026-05", ...]
}

const MONTH_NAMES: Record<string, number> = {
  january: 1, february: 2, march: 3, april: 4, may: 5, june: 6,
  july: 7, august: 8, september: 9, october: 10, november: 11, december: 12,
}

/**
 * Pull project number from a Job header label like "411 SYD2", "379 Airtrunk".
 * Returns the leading 3-digit number or null if not found.
 */
function parseProjectNumber(label: string): string | null {
  const m = label.trim().match(/^(\d{3})\b/)
  return m ? m[1]! : null
}

/**
 * Convert raw cell to number. Treats blanks, "#DIV/0!", and "-" as null.
 * Strips currency, commas, % signs.
 */
function parseAmount(raw: unknown): number | null {
  if (raw == null) return null
  const s = String(raw).trim()
  if (!s || s === "-" || s.includes("#DIV") || s.includes("#REF") || s.includes("#N/A")) return null
  const cleaned = s.replace(/[$,\s]/g, "").replace(/%$/, "")
  const n = parseFloat(cleaned)
  return Number.isFinite(n) ? n : null
}

/**
 * Convert a percentage cell (e.g. "10.00%", "0.10", "10") to a 0..1 number.
 */
function parsePercent(raw: unknown): number | null {
  if (raw == null) return null
  const s = String(raw).trim()
  if (!s || s === "-" || s.includes("#")) return null
  const hadPct = s.endsWith("%")
  const cleaned = s.replace(/[%\s]/g, "")
  const n = parseFloat(cleaned)
  if (!Number.isFinite(n)) return null
  if (hadPct) return n / 100
  if (n > 1) return n / 100
  return n
}

/**
 * Parse the header row to find month-pair column indexes.
 * Returns array of { remainingCol, claimedCol, yearMonth } for each month found.
 *
 * Strategy: the static columns are 0=Job, 1=Scope, 2=Scope Value, 3=Remaining
 * Value (current), 4=Claimed (current). Then alternating
 * [Remaining Value, Claimed] columns for each month moving forward.
 *
 * Accept any year heuristic: if header row only has "April", "May" etc.
 * without years, infer the year by anchoring "April" to the project's
 * fiscal year start. We default to 2024 for the first April encountered
 * and roll forward.
 */
function parseHeader(headerRow: string[]): Array<{ yearMonth: string; remainingCol: number; claimedCol: number }> {
  const months: Array<{ yearMonth: string; remainingCol: number; claimedCol: number }> = []
  let year = Number(process.env.MER_START_YEAR ?? 2024)
  let lastMonth = 0

  // Walk pairs of columns starting from index 5 (after the static cols)
  for (let i = 5; i < headerRow.length - 1; i += 2) {
    // Find the month label in any of the surrounding cells (sometimes merged)
    const label = String(headerRow[i] ?? headerRow[i + 1] ?? "").trim().toLowerCase()
    const monthNum = MONTH_NAMES[label] ?? 0
    if (!monthNum) continue
    if (monthNum < lastMonth) year++
    lastMonth = monthNum
    const yearMonth = `${year}-${String(monthNum).padStart(2, "0")}`
    months.push({
      yearMonth,
      remainingCol: i,
      claimedCol: i + 1,
    })
  }

  return months
}

/**
 * Walk data rows and emit scope + claim records.
 */
function parseDataRows(
  rows: string[][],
  monthCols: Array<{ yearMonth: string; remainingCol: number; claimedCol: number }>,
): { scopes: MerScope[]; claims: MerClaim[] } {
  const scopes: MerScope[] = []
  const claims: MerClaim[] = []

  let currentProjectLabel = ""
  let currentProjectNumber: string | null = null

  for (let r = 1; r < rows.length; r++) {
    const row = rows[r] ?? []
    const job = String(row[0] ?? "").trim()
    const scope = String(row[1] ?? "").trim()
    const scopeValue = parseAmount(row[2])
    const remainingValue = parseAmount(row[3])
    const claimedPct = parsePercent(row[4])

    // Project header row: only Job filled, nothing else
    if (job && !scope && scopeValue == null) {
      currentProjectLabel = job
      currentProjectNumber = parseProjectNumber(job)
      continue
    }

    // Skip totals or completely blank rows
    if (!scope) continue
    if (/^total/i.test(scope)) continue

    // We need a project context to attribute this scope
    if (!currentProjectNumber) continue

    const isVariation = /^V\d{1,3}$/i.test(scope) || /variation/i.test(scope)
    const id = `${currentProjectNumber}::${scope}`

    scopes.push({
      id,
      projectNumber: currentProjectNumber,
      projectLabel: currentProjectLabel,
      scopeName: scope,
      scopeValue,
      remainingValue,
      claimedPct,
      isVariation,
    })

    for (const m of monthCols) {
      const remaining = parseAmount(row[m.remainingCol])
      const claimed = parsePercent(row[m.claimedCol])
      if (remaining == null && claimed == null) continue
      claims.push({
        id: `${currentProjectNumber}::${scope}::${m.yearMonth}`,
        projectNumber: currentProjectNumber,
        scopeName: scope,
        yearMonth: m.yearMonth,
        remainingValue: remaining,
        claimedPct: claimed,
      })
    }
  }

  return { scopes, claims }
}

export async function fetchMer(opts?: { sheetId?: string; tab?: string }): Promise<MerData> {
  const sheetId = opts?.sheetId ?? process.env.GOOGLE_MER_SHEET_ID
  const tab = opts?.tab ?? process.env.GOOGLE_MER_TAB ?? "Sheet1"
  if (!sheetId) throw new Error("GOOGLE_MER_SHEET_ID not set")

  const auth = getGoogleAuth()
  const sheets = google.sheets({ version: "v4", auth })
  const range = `${tab}!A1:ZZZ500`
  const res = await sheets.spreadsheets.values.get({
    spreadsheetId: sheetId,
    range,
    valueRenderOption: "UNFORMATTED_VALUE",
  })
  const rows = (res.data.values ?? []) as unknown as string[][]
  if (rows.length === 0) {
    return { generatedAt: new Date().toISOString(), scopes: [], claims: [], monthsObserved: [] }
  }

  const monthCols = parseHeader(rows[0]!)
  const { scopes, claims } = parseDataRows(rows, monthCols)

  return {
    generatedAt: new Date().toISOString(),
    scopes,
    claims,
    monthsObserved: monthCols.map((m) => m.yearMonth),
  }
}

export async function pingMer(): Promise<{ ok: boolean; rows?: number; error?: string }> {
  try {
    const data = await fetchMer()
    return { ok: true, rows: data.scopes.length }
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : String(err) }
  }
}
