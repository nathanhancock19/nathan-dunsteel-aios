import fs from "node:fs"
import Airtable from "airtable"

fs.readFileSync(".env.local", "utf8").split(/\r?\n/).forEach((l) => {
  const m = l.match(/^([A-Z_]+)=(.*)/)
  if (m) process.env[m[1]] = m[2].replace(/\\\$/g, "$").replace(/^['"]|['"]$/g, "")
})

const base = new Airtable({ apiKey: process.env.AIRTABLE_API_KEY }).base(
  process.env.AIRTABLE_BASE_ID,
)

console.log("=== 5 most recent Day Dockets, raw Project values ===")
const recent = await base("Day Dockets")
  .select({ maxRecords: 5, sort: [{ field: "Date", direction: "desc" }] })
  .firstPage()
for (const r of recent) {
  console.log(
    "  -",
    r.fields["Docket Ref"],
    "| date:",
    r.fields["Date"],
    "| Project raw:",
    JSON.stringify(r.fields["Project"]),
  )
}

console.log("")
console.log("=== Try filter with 411 string match ===")
const byNumber = await base("Day Dockets")
  .select({
    filterByFormula: `FIND("411", ARRAYJOIN({Project}, ","))`,
    maxRecords: 5,
    sort: [{ field: "Date", direction: "desc" }],
  })
  .firstPage()
console.log(`Got ${byNumber.length} via FIND("411", ARRAYJOIN({Project}))`)
for (const r of byNumber) {
  console.log("  -", r.fields["Docket Ref"], "| date:", r.fields["Date"])
}
