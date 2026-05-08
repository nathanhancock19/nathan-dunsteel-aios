// Read the public delivery sheet CSV and report all jobs scheduled for a given day.
// Usage: node scripts/test-sheet-day.mjs "May" "8"

import { parse } from "csv-parse/sync"

const SHEET_ID = "1_IKGGCq2R7Dbs7N5glN3-DmgAYrG-Edt8XI7u8kKDDU"
const url = `https://docs.google.com/spreadsheets/d/${SHEET_ID}/export?format=csv`

const wantedMonth = process.argv[2] ?? "May"
const wantedDay = process.argv[3] ?? "8"

const res = await fetch(url)
if (!res.ok) {
  console.error("HTTP", res.status)
  process.exit(1)
}
const csv = await res.text()
const rows = parse(csv, { relax_column_count: true, skip_empty_lines: false })

// Row indexes in this sheet (0-based after parse)
// 0 = title
// 1 = drive folder + holiday tags
// 2 = month band (March / April / May ...)
// 3 = "Date" + day-of-month numbers
// 4 = "Day" + day names
const monthRow = rows[2] ?? []
const dateRow = rows[3] ?? []
const dayRow = rows[4] ?? []

// Forward-fill the month band (it may only be set on the first cell of each month).
const filledMonths = []
let lastMonth = ""
for (let c = 0; c < monthRow.length; c++) {
  const v = String(monthRow[c] ?? "").trim()
  if (v) lastMonth = v
  filledMonths[c] = lastMonth
}

let colIdx = -1
for (let c = 1; c < dateRow.length; c++) {
  if (
    filledMonths[c].toLowerCase().includes(wantedMonth.toLowerCase()) &&
    String(dateRow[c] ?? "").trim() === String(wantedDay).trim()
  ) {
    colIdx = c
    break
  }
}

if (colIdx < 0) {
  console.error(`Could not locate ${wantedMonth} ${wantedDay} in the sheet`)
  console.error("First 60 columns of date row:", dateRow.slice(0, 60))
  console.error("First 60 columns of month row (filled):", filledMonths.slice(0, 60))
  process.exit(1)
}

console.log(`Found ${wantedMonth} ${wantedDay} at column index ${colIdx}`)
console.log(`Day name: ${dayRow[colIdx]}`)
console.log("")

// Walk the rows and find each Job N block. For each, collect the values
// at colIdx for the attribute rows that follow it.
const jobs = []
let current = null
const attrLabels = new Set([
  "Project",
  "Details",
  "Truck",
  "Truck ",
  "Time",
  "SIGNED Delivery Docket Y/N",
  "Delivery Docket Y/N",
  "Contact",
  "PM",
  "Status",
  "Notes or Delivery Docket",
  "Delivery Request Form Number",
  "Delivery Request Form Link",
  "Completed",
])

for (const row of rows) {
  const label = String(row[0] ?? "").trim()
  if (/^Job \d+/i.test(label)) {
    if (current) jobs.push(current)
    current = { name: label, attrs: {} }
    continue
  }
  if (!current) continue
  if (attrLabels.has(label)) {
    const value = String(row[colIdx] ?? "").trim()
    if (value) current.attrs[label.replace(/\s+$/, "")] = value
  }
  // Stop processing this block when we hit another label that isn't in our set
  // (keeps extra "details" continuation rows from polluting later jobs)
}
if (current) jobs.push(current)

const populated = jobs.filter((j) => j.attrs.Project || j.attrs.Details)
console.log(`Job blocks with content for ${wantedMonth} ${wantedDay}: ${populated.length} of ${jobs.length}`)
console.log("")

for (const job of populated) {
  console.log(`--- ${job.name} ---`)
  for (const [k, v] of Object.entries(job.attrs)) {
    console.log(`  ${k}: ${v.replace(/\n/g, " | ")}`)
  }
  console.log("")
}
