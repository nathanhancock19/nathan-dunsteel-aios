/**
 * General Notes reader (cross-project).
 *
 * Schema: 14 categories (General, Design, Site, Commercial, Delivery, Safety,
 * Material, Logistics, QA, Fixings, Workshop, Programme, Drawings, Costing).
 * Priority: High / Medium / Low.
 * Status: Incomplete / Constant / In Progress / In Future / Done.
 */
import {
  queryDataSource,
  getTitle,
  getRichText,
  getSelect,
  getStatus,
  getMultiSelect,
  getDate,
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
}): GeneralNote {
  const props = page.properties
  return {
    id: page.id,
    title: getTitle(props) || "(no title)",
    body: getRichText(props, "Body") ?? getRichText(props, "Notes") ?? getRichText(props, "Description") ?? "",
    category: getSelect(props, "Category"),
    priority: getSelect(props, "Priority"),
    status: getStatus(props, "Status") ?? getSelect(props, "Status"),
    project: getSelect(props, "Project") ?? (getMultiSelect(props, "Project")[0] ?? null),
    date: getDate(props, "Date"),
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
  if (opts?.project) filters.push({ property: "Project", select: { equals: opts.project } })
  if (opts?.category) filters.push({ property: "Category", select: { equals: opts.category } })
  if (opts?.priority) filters.push({ property: "Priority", select: { equals: opts.priority } })
  if (opts?.status) filters.push({ or: [{ property: "Status", status: { equals: opts.status } }, { property: "Status", select: { equals: opts.status } }] })
  const filter = filters.length === 0 ? undefined : filters.length === 1 ? filters[0] : { and: filters }
  const rows = await queryDataSource({
    databaseId: db(),
    filter,
    sorts: [{ timestamp: "created_time", direction: "descending" }],
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
