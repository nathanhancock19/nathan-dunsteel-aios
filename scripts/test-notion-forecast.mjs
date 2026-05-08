import fs from "node:fs"
import { Client } from "@notionhq/client"

fs.readFileSync(".env.local", "utf8").split(/\r?\n/).forEach((l) => {
  const m = l.match(/^([A-Z_]+)=(.*)/)
  if (m) process.env[m[1]] = m[2].replace(/\\\$/g, "$").replace(/^['"]|['"]$/g, "")
})

const notion = new Client({ auth: process.env.NOTION_API_KEY })
const pageId = "344172156ac58078a1d6c99c9b188d6d"

const blocks = await notion.blocks.children.list({ block_id: pageId, page_size: 50 })
console.log(`Got ${blocks.results.length} top-level blocks (has_more=${blocks.has_more})`)
console.log("")

for (const block of blocks.results) {
  if (!("type" in block)) continue
  const type = block.type
  let preview = ""
  const data = block[type]
  if (data && "rich_text" in data && Array.isArray(data.rich_text)) {
    preview = data.rich_text.map((t) => t.plain_text).join("").slice(0, 120)
  } else if (data && "title" in data) {
    preview = String(data.title).slice(0, 120)
  } else if (data && "url" in data) {
    preview = String(data.url).slice(0, 120)
  } else if (type === "child_database") {
    preview = "[child_database id=" + block.id + "]"
  } else if (type === "child_page") {
    preview = "[child_page]"
  }
  console.log(`  [${type}] ${preview}`)
}
