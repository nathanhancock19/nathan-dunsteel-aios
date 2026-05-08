/**
 * Airtable service layer for the QuoteApprovals module.
 *
 * Manual entry for v1 (Outlook Mail.Read deferred until tenant approval).
 */

import { listRecords, createRecord, updateRecord } from "./client"
import { TABLES } from "./schema"
import type { QuoteApprovalFields } from "./types"
import type { Record as AirtableRecord, FieldSet } from "airtable"

function projectScope(): string | null {
  return process.env.AIOS_PRIMARY_PROJECT_NUMBER ?? null
}

export type QuoteApproval = {
  id: string
  projectIds: string[]
  supplier: string
  amount: number
  status: "Pending" | "Approved" | "Rejected" | string
  submittedAt?: string
}

function toQuote(r: AirtableRecord<QuoteApprovalFields & FieldSet>): QuoteApproval {
  return {
    id: r.id,
    projectIds: Array.isArray(r.fields.Project) ? (r.fields.Project as string[]) : [],
    supplier: String(r.fields.Supplier ?? ""),
    amount: Number(r.fields.Amount ?? 0),
    status: String(r.fields.Status ?? "Pending"),
    submittedAt: r.fields["Submitted At"] ? String(r.fields["Submitted At"]) : undefined,
  }
}

export async function listPendingQuotes(): Promise<QuoteApproval[]> {
  const clauses: string[] = ['{Status} = "Pending"']

  const project = projectScope()
  if (project) {
    clauses.push(`FIND("${project}", ARRAYJOIN({Project}, ","))`)
  }

  const records = await listRecords(TABLES.QUOTE_APPROVALS, {
    filterByFormula: `AND(${clauses.join(", ")})`,
    sort: [{ field: "Submitted At", direction: "desc" }],
    maxRecords: 50,
  })
  return records.map(toQuote)
}

export async function approveQuote(id: string): Promise<QuoteApproval> {
  const r = await updateRecord(TABLES.QUOTE_APPROVALS, id, {
    Status: "Approved",
  } as Partial<QuoteApprovalFields>)
  return toQuote(r)
}

export async function rejectQuote(id: string): Promise<QuoteApproval> {
  const r = await updateRecord(TABLES.QUOTE_APPROVALS, id, {
    Status: "Rejected",
  } as Partial<QuoteApprovalFields>)
  return toQuote(r)
}

export async function createQuote(fields: {
  projectIds: string[]
  supplier: string
  amount: number
}): Promise<QuoteApproval> {
  const r = await createRecord(TABLES.QUOTE_APPROVALS, {
    Project: fields.projectIds,
    Supplier: fields.supplier,
    Amount: fields.amount,
    Status: "Pending",
    "Submitted At": new Date().toISOString(),
  } as Partial<QuoteApprovalFields>)
  return toQuote(r)
}
