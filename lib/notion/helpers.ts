/**
 * Shared Notion helpers for AIOS.
 *
 * Centralises:
 *  - Client construction (cached)
 *  - Data source resolution (Notion v5 split databases into data sources)
 *  - Property extraction (titles, rich text, selects, dates, numbers, checkboxes, multi-selects, people)
 *  - Defensive page-to-record mapping
 */
import { Client } from "@notionhq/client"

let _client: Client | null = null

export function notion(): Client {
  if (_client) return _client
  const token = process.env.NOTION_API_KEY
  if (!token) throw new Error("NOTION_API_KEY not set")
  _client = new Client({ auth: token })
  return _client
}

/**
 * Notion v5 wrapped each database in a "data source" abstraction.
 * For a normal database, the data source ID is found by retrieving the DB.
 * Cached per database ID.
 */
const dataSourceCache = new Map<string, string>()
export async function getDataSourceId(databaseId: string): Promise<string> {
  const cached = dataSourceCache.get(databaseId)
  if (cached) return cached
  const client = notion()
  const db = await client.databases.retrieve({ database_id: databaseId })
  let id = databaseId
  if ("data_sources" in db && Array.isArray(db.data_sources) && db.data_sources[0]) {
    id = db.data_sources[0].id
  }
  dataSourceCache.set(databaseId, id)
  return id
}

/**
 * Run a query against a data source with shared error handling.
 */
export async function queryDataSource(args: {
  databaseId: string
  filter?: Record<string, unknown>
  sorts?: Array<Record<string, unknown>>
  pageSize?: number
}): Promise<Array<{ id: string; properties: Record<string, unknown>; url?: string; created_time?: string; last_edited_time?: string }>> {
  const client = notion()
  const ds = await getDataSourceId(args.databaseId)
  const queryArgs: Record<string, unknown> = {
    data_source_id: ds,
    page_size: args.pageSize ?? 50,
  }
  if (args.filter) queryArgs.filter = args.filter
  if (args.sorts) queryArgs.sorts = args.sorts
  const res = await client.dataSources.query(queryArgs as Parameters<typeof client.dataSources.query>[0])
  const results: Array<{
    id: string
    properties: Record<string, unknown>
    url?: string
    created_time?: string
    last_edited_time?: string
  }> = []
  for (const page of res.results) {
    if (!("properties" in page)) continue
    results.push({
      id: page.id,
      properties: page.properties as Record<string, unknown>,
      url: "url" in page && typeof page.url === "string" ? page.url : undefined,
      created_time: "created_time" in page ? String(page.created_time) : undefined,
      last_edited_time: "last_edited_time" in page ? String(page.last_edited_time) : undefined,
    })
  }
  return results
}

// ---- property extractors ------------------------------------------------

type AnyProp = Record<string, unknown>

export function getTitle(props: AnyProp): string {
  for (const v of Object.values(props)) {
    const p = v as { type?: string; title?: Array<{ plain_text?: string }> }
    if (p.type === "title" && Array.isArray(p.title)) {
      return p.title.map((t) => t.plain_text ?? "").join("")
    }
  }
  return ""
}

export function getRichText(props: AnyProp, key: string): string {
  const p = props[key] as { type?: string; rich_text?: Array<{ plain_text?: string }> } | undefined
  if (!p || p.type !== "rich_text" || !Array.isArray(p.rich_text)) return ""
  return p.rich_text.map((t) => t.plain_text ?? "").join("")
}

export function getSelect(props: AnyProp, key: string): string | null {
  const p = props[key] as { type?: string; select?: { name?: string } | null } | undefined
  if (!p || p.type !== "select" || !p.select) return null
  return p.select.name ?? null
}

export function getStatus(props: AnyProp, key: string): string | null {
  const p = props[key] as { type?: string; status?: { name?: string } | null } | undefined
  if (!p || p.type !== "status" || !p.status) return null
  return p.status.name ?? null
}

export function getMultiSelect(props: AnyProp, key: string): string[] {
  const p = props[key] as { type?: string; multi_select?: Array<{ name?: string }> } | undefined
  if (!p || p.type !== "multi_select" || !Array.isArray(p.multi_select)) return []
  return p.multi_select.map((s) => s.name ?? "").filter(Boolean)
}

export function getDate(props: AnyProp, key: string): string | null {
  const p = props[key] as { type?: string; date?: { start?: string } | null } | undefined
  if (!p || p.type !== "date" || !p.date) return null
  return p.date.start ?? null
}

export function getNumber(props: AnyProp, key: string): number | null {
  const p = props[key] as { type?: string; number?: number | null } | undefined
  if (!p || p.type !== "number") return null
  return p.number ?? null
}

export function getCheckbox(props: AnyProp, key: string): boolean {
  const p = props[key] as { type?: string; checkbox?: boolean } | undefined
  if (!p || p.type !== "checkbox") return false
  return !!p.checkbox
}

export function getPeople(props: AnyProp, key: string): string[] {
  const p = props[key] as { type?: string; people?: Array<{ name?: string }> } | undefined
  if (!p || p.type !== "people" || !Array.isArray(p.people)) return []
  return p.people.map((u) => u.name ?? "").filter(Boolean)
}

export function getUrl(props: AnyProp, key: string): string | null {
  const p = props[key] as { type?: string; url?: string | null } | undefined
  if (!p || p.type !== "url") return null
  return p.url ?? null
}

export function getCreatedTime(props: AnyProp): string | null {
  for (const v of Object.values(props)) {
    const p = v as { type?: string; created_time?: string }
    if (p.type === "created_time" && p.created_time) return p.created_time
  }
  return null
}

/**
 * Best-effort extract first matching property by candidate keys (case-insensitive substring).
 */
export function getByCandidate<T>(
  props: AnyProp,
  candidates: string[],
  extractor: (p: AnyProp, key: string) => T,
): T | undefined {
  for (const cand of candidates) {
    for (const key of Object.keys(props)) {
      if (key.toLowerCase().includes(cand.toLowerCase())) {
        const v = extractor(props, key)
        if (v != null && v !== "" && !(Array.isArray(v) && v.length === 0)) return v
      }
    }
  }
  return undefined
}
