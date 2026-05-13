/**
 * General Notes reader.
 *
 * Real database schema (verified via /v1/databases query 2026-05-13):
 *   - Note            title       (the headline)
 *   - Notes           rich_text   (the body)
 *   - Project Number  rich_text   (e.g. "411"; not a select)
 *   - Priority        select      (High | Medium | Low)
 *   - Status          status      (Incomplete | Constant | In progress | In Future | Done)
 *   - Date            last_edited_time
 *
 * There is no Category column on this database, despite earlier docs
 * mentioning 14 categories. The card renders a category badge only when
 * one is present, so a missing value is harmless.
 */
import {
  queryDataSource,
  getTitle,
  getRichText,
  getSelect,
  getStatus,
  getCreatedTime,
} from "./helpers"

export type GeneralNote = {
  id: string
  title: string
  body: string
  category: string | null
  priority: string | null
  status: string | null
  project: string | null
  date: string | null
  url?: string
  createdAt?: string
}

function db(): string {
  const id = process.env.NOTION_GENERAL_NOTES_DB
  if (!id) throw new Error("NOTION_GENERAL_NOTES_DB not set")
  return id
}

function mapNote(page: {
  id: string
  properties: Record<string, unknown>
  url?: string
  created_time?: string
  last_edited_time?: string
}): GeneralNote {
  const props = page.properties
  // Project lives in a rich_text column called "Project Number" (note the
  // space). Fall back to a plain "Project" lookup for resilience if the
  // schema is ever renamed.
  const projectText = getRichText(props, "Project Number") || getRichText(props, "Project")
  return {
    id: page.id,
    title: getTitle(props) || "(no title)",
    body: getRichText(props, "Notes") || getRichText(props, "Body") || getRichText(props, "Description"),
    category: getSelect(props, "Category"), // not in current schema; will be null
    priority: getSelect(props, "Priority"),
    status: getStatus(props, "Status") ?? getSelect(props, "Status"),
    project: projectText || null,
    date: page.last_edited_time ?? null,
    url: page.url,
    createdAt: page.created_time ?? getCreatedTime(props) ?? undefined,
  }
}

export async function getGeneralNotes(opts?: {
  project?: string
  category?: string
  priority?: string
  status?: string
  limit?: number
}): Promise<GeneralNote[]> {
  const filters: Array<Record<string, unknown>> = []
  // Project is rich_text — use `contains` so "411" matches "411", "411 ",
  // "Project 411", etc. without forcing an exact-match equality.
  if (opts?.project) {
    filters.push({ property: "Project Number", rich_text: { contains: opts.project } })
  }
  if (opts?.category) filters.push({ property: "Category", select: { equals: opts.category } })
  if (opts?.priority) filters.push({ property: "Priority", select: { equals: opts.priority } })
  if (opts?.status) {
    filters.push({
      or: [
        { property: "Status", status: { equals: opts.status } },
        { property: "Status", select: { equals: opts.status } },
      ],
    })
  }
  const filter = filters.length === 0 ? undefined : filters.length === 1 ? filters[0] : { and: filters }
  const rows = await queryDataSource({
    databaseId: db(),
    filter,
    sorts: [{ timestamp: "last_edited_time", direction: "descending" }],
    pageSize: opts?.limit ?? 50,
  })
  return rows.map(mapNote)
}

export async function getHighPriorityNotes(project?: string): Promise<GeneralNote[]> {
  const rows = await getGeneralNotes({
    project,
    priority: "High",
    limit: 25,
  })
  return rows.filter((n) => n.status !== "Done")
}
