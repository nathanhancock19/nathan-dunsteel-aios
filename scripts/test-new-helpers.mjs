import fs from "node:fs"

fs.readFileSync(".env.local", "utf8").split(/\r?\n/).forEach((l) => {
  const m = l.match(/^([A-Z_]+)=(.*)/)
  if (m) process.env[m[1]] = m[2].replace(/\\\$/g, "$").replace(/^['"]|['"]$/g, "")
})

const { getDeliveriesForDay } = await import("../lib/sheets/deliveries.ts").catch(async () => {
  // .ts can't be imported directly from .mjs; use the JS-friendly tsc output if needed.
  // Easier: replicate the call inline using node's built-in fetch
  const { parse } = await import("csv-parse/sync")
  const SHEET_ID = "1_IKGGCq2R7Dbs7N5glN3-DmgAYrG-Edt8XI7u8kKDDU"
  const url = `https://docs.google.com/spreadsheets/d/${SHEET_ID}/export?format=csv`
  const res = await fetch(url)
  const csv = await res.text()
  const rows = parse(csv, { relax_column_count: true, skip_empty_lines: false })
  return {
    getDeliveriesForDay: async ({ date, projectFilter }) => {
      const monthRow = rows[2] ?? []
      const dateRow = rows[3] ?? []
      const dayRow = rows[4] ?? []
      const months = ["January","February","March","April","May","June","July","August","September","October","November","December"]
      const t = new Date(date)
      const wantedMonth = months[t.getMonth()]
      const wantedDay = String(t.getDate())
      const filled = []
      let last = ""
      for (let i = 0; i < monthRow.length; i++) {
        const v = String(monthRow[i] ?? "").trim()
        if (months.includes(v)) last = v
        filled[i] = last
      }
      let col = -1
      for (let c = 1; c < dateRow.length; c++) {
        if (filled[c] === wantedMonth && String(dateRow[c] ?? "").trim() === wantedDay) {
          col = c
          break
        }
      }
      if (col < 0) return { date, monthLabel: "", dayName: "", jobs: [] }
      const attrs = {
        "Project": "project", "Details": "details", "Truck": "truck",
        "Time": "time", "SIGNED Delivery Docket Y/N": "signed",
        "Contact": "contact", "PM": "pm", "Status": "status",
      }
      const jobs = []
      let cur = null
      for (const row of rows) {
        const label = String(row[0] ?? "").trim().replace(/\s+$/, "")
        if (/^Job\s+\d+/i.test(label)) {
          if (cur && (cur.project || cur.details)) jobs.push(cur)
          cur = { project: "", details: "" }
          continue
        }
        if (!cur) continue
        if (attrs[label]) {
          const cell = String(row[col] ?? "").trim()
          if (cell) cur[attrs[label]] = cell
        }
      }
      if (cur && (cur.project || cur.details)) jobs.push(cur)
      let filtered = jobs.filter(j => j.project || j.details)
      if (projectFilter) {
        filtered = filtered.filter(j => j.project.toLowerCase().includes(projectFilter.toLowerCase()))
      }
      return { date, monthLabel: wantedMonth, dayName: String(dayRow[col] ?? ""), jobs: filtered }
    }
  }
})

console.log("=== May 8 2026, Project 411 only ===")
const r1 = await getDeliveriesForDay({ date: "2026-05-08", projectFilter: "411" })
console.log(JSON.stringify(r1, null, 2))
console.log("")
console.log("=== May 8 2026, no filter ===")
const r2 = await getDeliveriesForDay({ date: "2026-05-08" })
console.log("All jobs:", r2.jobs.length)
for (const j of r2.jobs) {
  console.log("  -", j.project || "(no project)", "|", j.details.slice(0, 60))
}
