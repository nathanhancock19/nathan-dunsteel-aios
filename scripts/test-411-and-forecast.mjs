import fs from "node:fs"
import Airtable from "airtable"
import { Client } from "@notionhq/client"

fs.readFileSync(".env.local", "utf8").split(/\r?\n/).forEach((l) => {
  const m = l.match(/^([A-Z_]+)=(.*)/)
  if (m) process.env[m[1]] = m[2].replace(/\\\$/g, "$").replace(/^['"]|['"]$/g, "")
})

const base = new Airtable({ apiKey: process.env.AIRTABLE_API_KEY }).base(
  process.env.AIRTABLE_BASE_ID,
)

console.log("=== Find 411 in Airtable Projects ===")
const projects = await base("Projects")
  .select({ filterByFormula: 'SEARCH("411", {Project Number})' })
  .all()

for (const p of projects) {
  console.log(
    "  -",
    p.id,
    "|",
    p.fields["Project Number"],
    "|",
    p.fields["Strumus Name"],
    "| status:",
    p.fields["Status"],
  )
}

console.log("")
console.log("=== Try to read the Notion Project Forecast page ===")
const notion = new Client({ auth: process.env.NOTION_API_KEY })
const pageId = "344172156ac58078a1d6c99c9b188d6d"

try {
  const page = await notion.pages.retrieve({ page_id: pageId })
  console.log("OK, page exists.")
  console.log("Page object:", page.object)
  if ("url" in page) console.log("URL:", page.url)
  if ("created_time" in page) console.log("Created:", page.created_time)
  if ("last_edited_time" in page) console.log("Edited:", page.last_edited_time)
  if ("properties" in page) {
    console.log("Properties:")
    for (const [name, prop] of Object.entries(page.properties)) {
      console.log(`  ${name}: type=${prop.type}`)
    }
  }
} catch (err) {
  console.log("ERROR:", err.message)
  if (err.code) console.log("Code:", err.code)
  console.log("")
  console.log(
    "If 'object_not_found' or 'restricted_resource', share the Notion page with the AIOS integration:",
  )
  console.log("  Open the page in Notion -> ... menu -> Connect to -> select your integration")
}

console.log("")
console.log("=== Today's dockets filtered to 411 ===")
if (projects.length > 0) {
  const projectId = projects[0].id
  const today = new Date().toISOString().slice(0, 10)
  const dockets = await base("Day Dockets")
    .select({
      filterByFormula: `AND(IS_SAME({Date}, "${today}", "day"), FIND("${projectId}", ARRAYJOIN({Project})))`,
      maxRecords: 50,
    })
    .all()
  console.log(`Found ${dockets.length} 411 dockets for today`)
  for (const d of dockets.slice(0, 5)) {
    console.log("  -", d.fields["Docket Ref"], "| status:", d.fields["Status"])
  }

  // Show some recent 411 dockets to confirm filter works at all
  const recent = await base("Day Dockets")
    .select({
      filterByFormula: `FIND("${projectId}", ARRAYJOIN({Project}))`,
      maxRecords: 5,
      sort: [{ field: "Date", direction: "desc" }],
    })
    .firstPage()
  console.log(`Most recent 5 411 dockets:`)
  for (const d of recent) {
    console.log("  -", d.fields["Docket Ref"], "| date:", d.fields["Date"], "| status:", d.fields["Status"])
  }
}
