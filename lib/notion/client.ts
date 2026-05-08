/**
 * Notion client for AIOS.
 *
 * Used for the read-only Site Diary widget on the Dashboard. AIOS does not
 * write to Notion. The site diary database ID comes from
 * NOTION_SITE_DIARY_DATABASE_ID; it may be a different integration than the
 * one that writes diary entries (which lives in n8n workflows).
 */

import { Client } from "@notionhq/client"

let _client: Client | null = null

function getClient(): Client {
  if (_client) return _client
  const token = process.env.NOTION_SITE_DIARY_API_KEY ?? process.env.NOTION_API_KEY
  if (!token) {
    throw new Error("Notion env vars not set: NOTION_API_KEY or NOTION_SITE_DIARY_API_KEY")
  }
  _client = new Client({ auth: token })
  return _client
}

export type SiteDiaryEntry = {
  id: string
  title: string
  project?: string
  date?: string
  url: string
}

/**
 * Fetch the most recent N site diary entries from the configured database.
 * Returns a flattened, UI-friendly shape. Throws if env is missing or
 * Notion returns an error.
 */
export async function getRecentSiteDiaryEntries(limit = 5): Promise<SiteDiaryEntry[]> {
  const client = getClient()
  const databaseId = process.env.NOTION_SITE_DIARY_DATABASE_ID
  if (!databaseId) {
    throw new Error("NOTION_SITE_DIARY_DATABASE_ID not set")
  }

  // Notion v5 split databases into data sources. For a simple database,
  // the data source id can be discovered by retrieving the database first.
  const db = await client.databases.retrieve({ database_id: databaseId })
  const dataSourceId =
    "data_sources" in db && Array.isArray(db.data_sources) && db.data_sources[0]
      ? db.data_sources[0].id
      : databaseId

  const res = await client.dataSources.query({
    data_source_id: dataSourceId,
    page_size: limit,
    sorts: [{ timestamp: "created_time", direction: "descending" }],
  })

  return res.results.map((page) => {
    if (!("properties" in page)) {
      return { id: page.id, title: "(no title)", url: "https://notion.so/" + page.id.replaceAll("-", "") }
    }
    const props = page.properties
    let title = "(untitled)"
    let project: string | undefined
    let date: string | undefined
    for (const [key, value] of Object.entries(props)) {
      if (value.type === "title" && value.title.length > 0) {
        title = value.title.map((t: { plain_text: string }) => t.plain_text).join("")
      }
      if (value.type === "select" && value.select?.name && /project/i.test(key)) {
        project = value.select.name
      }
      if (value.type === "date" && value.date?.start) {
        date = value.date.start
      }
    }
    const url = "url" in page && typeof page.url === "string"
      ? page.url
      : "https://notion.so/" + page.id.replaceAll("-", "")
    return { id: page.id, title, project, date, url }
  })
}

export async function pingNotion(): Promise<{ ok: boolean; error?: string }> {
  try {
    const client = getClient()
    await client.users.me({})
    return { ok: true }
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : String(err) }
  }
}
