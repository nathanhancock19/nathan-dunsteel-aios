/**
 * Airtable variations service.
 *
 * Reads/writes the Variations and VariationLineItems tables. These are
 * AIOS-owned tables per spec Section 5. If the tables don't exist yet,
 * functions throw with a clear "create the table" message.
 */
import { listRecords, findRecord, createRecord, TABLES } from "./index"

export type Variation = {
  id: string
  variationNumber: string
  title: string
  projectId: string
  status: string
  total: number | null
  createdAt: string | null
  approvedAt: string | null
}

export type VariationLineItem = {
  id: string
  variationId: string
  description: string
  quantity: number
  unit: string | null
  rate: number
  total: number
}

function projectFilter(): string {
  const p = process.env.AIOS_PRIMARY_PROJECT_NUMBER ?? "411"
  return `FIND("${p}", ARRAYJOIN({Project}, ","))`
}

export async function listVariations(opts?: { status?: string; limit?: number }): Promise<Variation[]> {
  const clauses: string[] = [projectFilter()]
  if (opts?.status) clauses.push(`{Status} = "${opts.status}"`)
  const formula = clauses.length === 1 ? clauses[0]! : `AND(${clauses.join(", ")})`
  const records = await listRecords(TABLES.VARIATIONS, {
    filterByFormula: formula,
    maxRecords: opts?.limit ?? 50,
    sort: [{ field: "Created At", direction: "desc" }],
  })
  return records.map((r) => ({
    id: r.id,
    variationNumber: String(r.fields["Variation Number"] ?? ""),
    title: String(r.fields["Title"] ?? ""),
    projectId: Array.isArray(r.fields["Project"]) ? (r.fields["Project"][0] as string) : "",
    status: String(r.fields["Status"] ?? "Pending"),
    total: r.fields["Total"] != null ? Number(r.fields["Total"]) : null,
    createdAt: r.fields["Created At"] != null ? String(r.fields["Created At"]) : null,
    approvedAt: r.fields["Approved At"] != null ? String(r.fields["Approved At"]) : null,
  }))
}

export async function getVariation(id: string): Promise<{ variation: Variation; lineItems: VariationLineItem[] }> {
  const r = await findRecord(TABLES.VARIATIONS, id)
  const variation: Variation = {
    id: r.id,
    variationNumber: String(r.fields["Variation Number"] ?? ""),
    title: String(r.fields["Title"] ?? ""),
    projectId: Array.isArray(r.fields["Project"]) ? (r.fields["Project"][0] as string) : "",
    status: String(r.fields["Status"] ?? "Pending"),
    total: r.fields["Total"] != null ? Number(r.fields["Total"]) : null,
    createdAt: r.fields["Created At"] != null ? String(r.fields["Created At"]) : null,
    approvedAt: r.fields["Approved At"] != null ? String(r.fields["Approved At"]) : null,
  }
  const items = await listRecords(TABLES.VARIATION_LINE_ITEMS, {
    filterByFormula: `FIND("${r.id}", ARRAYJOIN({Variation}, ","))`,
    maxRecords: 200,
  })
  const lineItems: VariationLineItem[] = items.map((i) => ({
    id: i.id,
    variationId: r.id,
    description: String(i.fields["Description"] ?? ""),
    quantity: Number(i.fields["Quantity"] ?? 0),
    unit: i.fields["Unit"] != null ? String(i.fields["Unit"]) : null,
    rate: Number(i.fields["Rate"] ?? 0),
    total: Number(i.fields["Total"] ?? Number(i.fields["Quantity"] ?? 0) * Number(i.fields["Rate"] ?? 0)),
  }))
  return { variation, lineItems }
}

export async function createVariationDraft(args: {
  variationNumber: string
  title: string
  projectId: string
}): Promise<Variation> {
  const r = await createRecord(TABLES.VARIATIONS, {
    "Variation Number": args.variationNumber,
    Title: args.title,
    Project: [args.projectId],
    Status: "Pending",
  })
  return {
    id: r.id,
    variationNumber: String(r.fields["Variation Number"] ?? args.variationNumber),
    title: String(r.fields["Title"] ?? args.title),
    projectId: args.projectId,
    status: "Pending",
    total: null,
    createdAt: r.fields["Created At"] != null ? String(r.fields["Created At"]) : null,
    approvedAt: null,
  }
}

export async function addLineItem(variationId: string, line: { description: string; quantity: number; unit?: string; rate: number }): Promise<VariationLineItem> {
  const r = await createRecord(TABLES.VARIATION_LINE_ITEMS, {
    Variation: [variationId],
    Description: line.description,
    Quantity: line.quantity,
    Unit: line.unit,
    Rate: line.rate,
  })
  return {
    id: r.id,
    variationId,
    description: line.description,
    quantity: line.quantity,
    unit: line.unit ?? null,
    rate: line.rate,
    total: line.quantity * line.rate,
  }
}

export async function listVariationRates(): Promise<Array<{ id: string; itemCode: string; description: string; unit: string; rate: number }>> {
  try {
    const records = await listRecords(TABLES.VARIATION_RATES, {
      filterByFormula: `{Active}`,
      maxRecords: 100,
      sort: [{ field: "Item Code", direction: "asc" }],
    })
    return records.map((r) => ({
      id: r.id,
      itemCode: String(r.fields["Item Code"] ?? ""),
      description: String(r.fields["Description"] ?? ""),
      unit: String(r.fields["Unit"] ?? ""),
      rate: Number(r.fields["Rate"] ?? 0),
    }))
  } catch {
    return []
  }
}
