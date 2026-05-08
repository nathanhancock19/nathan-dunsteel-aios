/**
 * Project Forecast helper.
 *
 * Reads the Notion page identified by NOTION_FORECAST_PAGE_ID. The page is
 * structured as a Notion table block at the top level. Notion table cells
 * are rich-text arrays inside child table_row blocks.
 */

import { Client } from "@notionhq/client"

let _client: Client | null = null

function getClient(): Client {
  if (_client) return _client
  const token = process.env.NOTION_API_KEY
  if (!token) throw new Error("NOTION_API_KEY not set")
  _client = new Client({ auth: token })
  return _client
}

type RichTextLike = { plain_text: string }

function richTextToString(rich: RichTextLike[] | undefined): string {
  if (!Array.isArray(rich)) return ""
  return rich.map((r) => r.plain_text).join("")
}

export type ForecastTable = {
  pageId: string
  lastEdited: string | null
  headers: string[]
  rows: string[][]
}

export async function getProjectForecast(): Promise<ForecastTable | null> {
  const pageId = process.env.NOTION_FORECAST_PAGE_ID
  if (!pageId) return null

  const client = getClient()

  const page = await client.pages.retrieve({ page_id: pageId })
  const lastEdited =
    "last_edited_time" in page && typeof page.last_edited_time === "string"
      ? page.last_edited_time
      : null

  // Top-level blocks on the page; expect at least one `table` block.
  const top = await client.blocks.children.list({ block_id: pageId, page_size: 50 })
  const tableBlock = top.results.find(
    (b) => "type" in b && b.type === "table",
  )
  if (!tableBlock || !("id" in tableBlock)) {
    return { pageId, lastEdited, headers: [], rows: [] }
  }

  // Fetch table rows (each is a table_row block under the table)
  const rowBlocks: { cells: RichTextLike[][] }[] = []
  let cursor: string | undefined
  do {
    const res = await client.blocks.children.list({
      block_id: tableBlock.id,
      page_size: 100,
      start_cursor: cursor,
    })
    for (const b of res.results) {
      if ("type" in b && b.type === "table_row" && "table_row" in b) {
        const cells = (b as { table_row: { cells: RichTextLike[][] } }).table_row.cells
        rowBlocks.push({ cells })
      }
    }
    cursor = res.has_more ? (res.next_cursor ?? undefined) : undefined
  } while (cursor)

  if (rowBlocks.length === 0) {
    return { pageId, lastEdited, headers: [], rows: [] }
  }

  const [header, ...body] = rowBlocks
  const headers = header.cells.map((c) => richTextToString(c).trim())
  const rows = body.map((r) => r.cells.map((c) => richTextToString(c).trim()))
  return { pageId, lastEdited, headers, rows }
}
