/**
 * MER (Monthly Earnings Report) reader.
 *
 * The MER is Nathan's manually-maintained Google Sheet tracking claims and
 * revenue per scope per month across all Dunsteel projects.
 *
 * Actual sheet layout (verified by debug script, 2026-05-11):
 *
 *   Row 0           empty
 *   Row 1           month name labels (every 4 cols starting at col 3):
 *                   "" "" "" "April" "" "" "" "May" "" "" "" "June" ...
 *   Row 2           static column headers
 *   Row 3+          project header rows (single cell, e.g. "379 Airtrunk",
 *                   "SYD2") followed by scope rows.
 *
 *   Per-row columns:
 *     0  Job index ("Scope 1", "Scope 2", ... or "V01" for variations)
 *     1  Scope name ("Shell A Level 2 Steel Roof")
 *     2  Scope value (total contract value)
 *     3  Remaining Value (current, latest)
 *     4  Claimed cumulative %  (current, latest)
 *     5+ Month blocks, 4 cols each:
 *         [thisMonth%, thisMonth$, remainingAfter, cumulativePct]
 *         The first cumulative % at col 5 == first month's cumulative claim
 *
 *   Project name aliases (sheet uses friendly names; we normalise to the
 *   project number used everywhere else in AIOS):
 *     "SYD2"            -> "411"
 *     "411 SYD2"        -> "411"
 *     "<n> Airtrunk"    -> "<n>" (e.g. "379")
 *     anything starting with a 3-digit number -> that number
 */
import { google } from "googleapis"
import { getGoogleAuth } from "@/lib/google/auth"

export type MerScope = {
  id: string
  projectNumber: string
  projectLabel: string
  scopeName: string
  scopeValue: number | null
  remainingValue: number | null
  claimedPct: number | null
  isVariation: boolean
}

export type MerClaim = {
  id: string
  projectNumber: string
  scopeName: string
  yearMonth: string
  remainingValue: number | null
  claimedPct: number | null
}

export type MerData = {
  generatedAt: string
  scopes: MerScope[]
  claims: MerClaim[]
  monthsObserved: string[]
}

const MONTH_NAMES: Record<string, number> = {
  january: 1, february: 2, march: 3, april: 4, may: 5, june: 6,
  july: 7, august: 8, september: 9, october: 10, november: 11, december: 12,
}

const PROJECT_ALIASES: Record<string, string> = {
  syd2: "411",
}

function parseProjectLabel(label: string): string | null {
  const trimmed = label.trim()
  if (!trimmed) return null
  // Numeric prefix wins
  const m = trimmed.match(/^(\d{3,4})\b/)
  if (m) return m[1]!
  // Try alias map
  const lower = trimmed.toLowerCase()
  if (PROJECT_ALIASES[lower]) return PROJECT_ALIASES[lower]!
  return null
}

function parseAmount(raw: unknown): number | null {
  if (raw == null) return null
  const s = String(raw).trim()
  if (!s || s === "-" || s.includes("#DIV") || s.includes("#REF") || s.includes("#N/A")) return null
  const cleaned = s.replace(/[$,\s]/g, "").replace(/%$/, "")
  const n = parseFloat(cleaned)
  return Number.isFinite(n) ? n : null
}

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
 * Parse the month-label row (index 1) into a list of month blocks.
 * Each block has the starting column index and a year-month string.
 *
 * Layout: month labels appear at cols 3, 7, 11, ... (every 4 cols).
 *
 * The block at col 5 is the FIRST month's per-month data; cols 3+4 are
 * cumulative-to-date snapshots, not a real month. The label "April" at
 * col 3 in row 1 spans the cumulative columns + the first month block.
 *
 * Strategy: find every non-empty label in row 1; each becomes a month at
 * the next 4-col-aligned data block starting at col 5.
 *
 * Year: infer by anchoring to MER_START_YEAR (default 2024); rolls forward
 * when month number drops.
 */
function parseMonthBlocks(monthRow: string[]): Array<{ yearMonth: string; pctCol: number; dollarCol: number; remainCol: number; cumCol: number }> {
  const blocks: Array<{ yearMonth: string; pctCol: number; dollarCol: number; remainCol: number; cumCol: number }> = []
  let year = Number(process.env.MER_START_YEAR ?? 2024)
  let lastMonth = 0

  // Find each labelled column from index 3 onward
  const monthCols: Array<{ col: number; month: number }> = []
  for (let i = 3; i < monthRow.length; i++) {
    const label = String(monthRow[i] ?? "").trim().toLowerCase()
    if (label && MONTH_NAMES[label]) {
      monthCols.push({ col: i, month: MONTH_NAMES[label]! })
    }
  }

  // Each month label corresponds to a per-month data block starting 2
  // columns after the label (so col 3 label -> block starts at col 5).
  for (const m of monthCols) {
    if (m.month < lastMonth) year++
    lastMonth = m.month
    const yearMonth = `${year}-${String(m.month).padStart(2, "0")}`
    const blockStart = m.col + 2 // April at col 3 -> first per-month block at col 5
    blocks.push({
      yearMonth,
      pctCol: blockStart,        // this month claim %
      dollarCol: blockStart + 1, // this month claim $
      remainCol: blockStart + 2, // remaining after this month
      cumCol: blockStart + 3,    // cumulative % at end of this month
    })
  }
  return blocks
}

function parseDataRows(
  rows: string[][],
  blocks: ReturnType<typeof parseMonthBlocks>,
): { scopes: MerScope[]; claims: MerClaim[] } {
  const scopes: MerScope[] = []
  const claims: MerClaim[] = []

  let currentProjectLabel = ""
  let currentProjectNumber: string | null = null

  for (let r = 3; r < rows.length; r++) {
    const row = rows[r] ?? []
    const job = String(row[0] ?? "").trim()
    const scope = String(row[1] ?? "").trim()
    const scopeValueRaw = row[2]

    // Project header row: only Job filled, nothing else
    if (job && !scope && (!scopeValueRaw || parseAmount(scopeValueRaw) == null)) {
      currentProjectLabel = job
      currentProjectNumber = parseProjectLabel(job)
      continue
    }

    // Skip blank rows
    if (!job && !scope) continue
    // Skip TOTALS row
    if (/^total/i.test(job) || /^total/i.test(scope)) continue
    // Skip template/copy-me rows
    if (/template|copy this|placeholder/i.test(scope) || /template|copy this/i.test(job)) continue
    // We need both a current project context and either Job or Scope to identify the row
    if (!currentProjectNumber) continue
    if (!scope) continue

    const isVariation = /^V\d{1,3}$/i.test(scope) || /^V\d{1,3}$/i.test(job) || /variation/i.test(scope)
    const id = `${currentProjectNumber}::${scope}`

    scopes.push({
      id,
      projectNumber: currentProjectNumber,
      projectLabel: currentProjectLabel,
      scopeName: scope,
      scopeValue: parseAmount(row[2]),
      remainingValue: parseAmount(row[3]),
      claimedPct: parsePercent(row[4]),
      isVariation,
    })

    for (const b of blocks) {
      const thisMonthPct = parsePercent(row[b.pctCol])
      const remaining = parseAmount(row[b.remainCol])
      if (thisMonthPct == null && remaining == null) continue
      claims.push({
        id: `${currentProjectNumber}::${scope}::${b.yearMonth}`,
        projectNumber: currentProjectNumber,
        scopeName: scope,
        yearMonth: b.yearMonth,
        remainingValue: remaining,
        claimedPct: thisMonthPct,
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
  const range = `${tab}!A1:CN200`
  const res = await sheets.spreadsheets.values.get({
    spreadsheetId: sheetId,
    range,
    valueRenderOption: "FORMATTED_VALUE",
  })
  const rows = (res.data.values ?? []) as unknown as string[][]
  if (rows.length === 0) {
    return { generatedAt: new Date().toISOString(), scopes: [], claims: [], monthsObserved: [] }
  }

  // Month labels live on row 1 (index 1)
  const monthRow = rows[1] ?? []
  const blocks = parseMonthBlocks(monthRow)
  const { scopes, claims } = parseDataRows(rows, blocks)

  return {
    generatedAt: new Date().toISOString(),
    scopes,
    claims,
    monthsObserved: blocks.map((b) => b.yearMonth),
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
