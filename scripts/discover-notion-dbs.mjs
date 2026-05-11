import { Client } from "@notionhq/client"

const token = process.env.NOTION_API_KEY
if (!token) { console.error("NOTION_API_KEY not set"); process.exit(1) }
const notion = new Client({ auth: token })

console.log("Searching Notion workspace for databases the AIOS token can access...")
const search = await notion.search({
  filter: { property: "object", value: "data_source" },
  page_size: 100,
})
console.log(`\nFound ${search.results.length} databases:\n`)
for (const db of search.results) {
  const title = db.title?.map((t) => t.plain_text).join("") || "(untitled)"
  const parent = db.parent?.type === "page_id"
    ? `page:${db.parent.page_id}`
    : db.parent?.type === "workspace"
    ? "workspace"
    : db.parent?.type ?? "?"
  console.log(`  ${db.id}  ${title}  [${parent}]`)
}
