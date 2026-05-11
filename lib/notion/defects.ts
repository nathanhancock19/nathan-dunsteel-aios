/**
 * Defects register reader (Project 411).
 *
 * Schema: type, severity, status (Identified -> In Progress -> Rectified/Deferred),
 * cost impact (AUD), bidirectional relation to site diary.
 */
import {
  queryDataSource,
  getTitle,
  getRichText,
  getSelect,
  getStatus,
  getDate,
  getNumber,
  getCreatedTime,
} from "./helpers"

export type Defect = {
  id: string
  title: string
  type: string | null
  severity: string | null
  status: string | null
  costImpact: number | null
  description: string
  identifiedDate: string | null
  rectifiedDate: string | null
  assembly: string | null
  location: string | null
  url?: string
  createdAt?: string
}

function db(): string {
  const id = process.env.NOTION_DEFECTS_411_DB
  if (!id) throw new Error("NOTION_DEFECTS_411_DB not set")
  return id
}

function mapDefect(page: {
  id: string
  properties: Record<string, unknown>
  url?: string
  created_time?: string
}): Defect {
  const props = page.properties
  return {
    id: page.id,
    title: getTitle(props) || "(no title)",
    type: getSelect(props, "Type") ?? getSelect(props, "Defect Type"),
    severity: getSelect(props, "Severity"),
    status: getStatus(props, "Status") ?? getSelect(props, "Status"),
    costImpact: getNumber(props, "Cost Impact") ?? getNumber(props, "Cost"),
    description: getRichText(props, "Description") ?? getRichText(props, "Notes") ?? "",
    identifiedDate: getDate(props, "Identified") ?? getDate(props, "Date"),
    rectifiedDate: getDate(props, "Rectified") ?? getDate(props, "Rectified Date"),
    assembly: getRichText(props, "Assembly") ?? getRichText(props, "Mark") ?? null,
    location: getRichText(props, "Location"),
    url: page.url,
    createdAt: page.created_time ?? getCreatedTime(props) ?? undefined,
  }
}

export async function getDefectsList(opts?: { limit?: number; status?: string }): Promise<Defect[]> {
  const filter = opts?.status
    ? ({ or: [{ property: "Status", status: { equals: opts.status } }, { property: "Status", select: { equals: opts.status } }] } as Record<string, unknown>)
    : undefined
  const rows = await queryDataSource({
    databaseId: db(),
    filter,
    sorts: [{ timestamp: "created_time", direction: "descending" }],
    pageSize: opts?.limit ?? 50,
  })
  return rows.map(mapDefect)
}

export async function getDefectsSummary(): Promise<{
  total: number
  byStatus: Record<string, number>
  bySeverity: Record<string, number>
  totalCostImpact: number
  recent: Defect[]
}> {
  const all = await getDefectsList({ limit: 100 })
  const byStatus: Record<string, number> = {}
  const bySeverity: Record<string, number> = {}
  let totalCostImpact = 0
  for (const d of all) {
    if (d.status) byStatus[d.status] = (byStatus[d.status] ?? 0) + 1
    if (d.severity) bySeverity[d.severity] = (bySeverity[d.severity] ?? 0) + 1
    if (d.costImpact) totalCostImpact += d.costImpact
  }
  return {
    total: all.length,
    byStatus,
    bySeverity,
    totalCostImpact,
    recent: all.slice(0, 10),
  }
}

export async function getOpenHighSeverityDefects(): Promise<Defect[]> {
  const all = await getDefectsList({ limit: 100 })
  return all.filter(
    (d) =>
      (d.severity === "High" || d.severity === "Critical") &&
      d.status !== "Rectified" &&
      d.status !== "Deferred"
  )
}
