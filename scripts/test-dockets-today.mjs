import fs from "node:fs"
import Airtable from "airtable"

fs.readFileSync(".env.local", "utf8").split(/\r?\n/).forEach((l) => {
  const m = l.match(/^([A-Z_]+)=(.*)/)
  if (m) process.env[m[1]] = m[2].replace(/\\\$/g, "$").replace(/^['"]|['"]$/g, "")
})

const base = new Airtable({ apiKey: process.env.AIRTABLE_API_KEY }).base(
  process.env.AIRTABLE_BASE_ID,
)

const today = new Date().toISOString().slice(0, 10)
console.log("Querying Day Dockets where Date is today =", today)

const records = await base("Day Dockets")
  .select({
    filterByFormula: `IS_SAME({Date}, "${today}", "day")`,
    fields: ["Docket Ref", "Project", "Company", "Status", "Date", "Worker Entries"],
  })
  .all()

console.log("Found", records.length, "dockets for today")
for (const r of records.slice(0, 5)) {
  console.log(
    "  -",
    r.fields["Docket Ref"],
    "| status:",
    r.fields.Status,
    "| workers:",
    (r.fields["Worker Entries"] ?? []).length,
  )
}

if (records.length === 0) {
  console.log("Trying without date filter, last 5 dockets:")
  const recent = await base("Day Dockets").select({ maxRecords: 5 }).firstPage()
  for (const r of recent) {
    console.log("  -", r.fields["Docket Ref"], "| date:", r.fields.Date, "| status:", r.fields.Status)
  }
}
