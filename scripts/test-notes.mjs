import { Client } from "@notionhq/client"
const c = new Client({ auth: process.env.NOTION_API_KEY })
const id = process.env.NOTION_GENERAL_NOTES_DB

// First, retrieve the data source to see properties
try {
  const r = await fetch(`https://api.notion.com/v1/data_sources/${id}`, {
    headers: { Authorization: `Bearer ${process.env.NOTION_API_KEY}`, "Notion-Version": "2025-09-03" }
  })
  if (!r.ok) { console.log("retrieve FAIL", r.status, await r.text()); process.exit(1) }
  const d = await r.json()
  console.log("Properties:")
  for (const [k, v] of Object.entries(d.properties || {})) {
    console.log("  -", k, "(", v.type, ")")
    if (v.type === "select" || v.type === "status") {
      const opts = v[v.type]?.options || []
      for (const o of opts.slice(0,8)) console.log("       option:", o.name)
    }
  }
} catch (e) { console.log("ERR1", e.message); process.exit(1) }

// Try the query that's failing
console.log("\nQuery: priority=High filter")
try {
  const r = await c.dataSources.query({
    data_source_id: id,
    filter: { property: "Priority", select: { equals: "High" } },
    page_size: 3,
  })
  console.log("OK", r.results.length, "results")
} catch (e) {
  console.log("FAIL:", e.message?.slice(0, 200))
}
