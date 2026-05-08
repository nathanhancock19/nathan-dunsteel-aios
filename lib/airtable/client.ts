/**
 * Typed Airtable client for AIOS.
 *
 * Wraps the official `airtable` SDK with TypeScript field types per table
 * and a small set of helpers (list, find, create, update). Keep this file
 * thin: anything table-specific belongs in a service module, not here.
 */

import Airtable, { FieldSet, Records, Record as AirtableRecord, Table } from "airtable"
import { TABLES, type TableName } from "./schema"
import type {
  ProjectFields,
  ActivityLogFields,
  DayDocketFields,
  CompanyFields,
  BudgetItemFields,
  VariationFields,
  VariationLineItemFields,
  VariationRateFields,
  CommittedCostFields,
  DeliveryFields,
  SiteWorksEntryFields,
  DeliveryNoteFields,
  DeliveryStatusOverrideFields,
  QuoteApprovalFields,
  AIUsageLogFields,
} from "./types"

let _base: Airtable.Base | null = null

function getBase(): Airtable.Base {
  if (_base) return _base
  const apiKey = process.env.AIRTABLE_API_KEY
  const baseId = process.env.AIRTABLE_BASE_ID
  if (!apiKey || !baseId) {
    throw new Error("Airtable env vars not set: AIRTABLE_API_KEY and/or AIRTABLE_BASE_ID")
  }
  _base = new Airtable({ apiKey }).base(baseId)
  return _base
}

/**
 * Map of table name to its TypeScript field type. Keep in sync with schema.ts.
 */
type TableFieldMap = {
  [TABLES.PROJECTS]: ProjectFields
  [TABLES.ACTIVITY_LOG]: ActivityLogFields
  [TABLES.DAY_DOCKETS]: DayDocketFields
  [TABLES.COMPANIES]: CompanyFields
  [TABLES.BUDGET_ITEMS]: BudgetItemFields
  [TABLES.VARIATIONS]: VariationFields
  [TABLES.VARIATION_LINE_ITEMS]: VariationLineItemFields
  [TABLES.VARIATION_RATES]: VariationRateFields
  [TABLES.COMMITTED_COSTS]: CommittedCostFields
  [TABLES.DELIVERIES]: DeliveryFields
  [TABLES.SITE_WORKS_ENTRIES]: SiteWorksEntryFields
  [TABLES.DELIVERY_NOTES]: DeliveryNoteFields
  [TABLES.DELIVERY_STATUS_OVERRIDES]: DeliveryStatusOverrideFields
  [TABLES.QUOTE_APPROVALS]: QuoteApprovalFields
  [TABLES.AI_USAGE_LOG]: AIUsageLogFields
}

export function table<T extends TableName>(name: T): Table<TableFieldMap[T] & FieldSet> {
  return getBase()<TableFieldMap[T] & FieldSet>(name)
}

/**
 * List records from a table with optional select params.
 */
export async function listRecords<T extends TableName>(
  name: T,
  params?: Parameters<Table<TableFieldMap[T] & FieldSet>["select"]>[0],
): Promise<Records<TableFieldMap[T] & FieldSet>> {
  return table(name).select(params).all()
}

export async function findRecord<T extends TableName>(
  name: T,
  id: string,
): Promise<AirtableRecord<TableFieldMap[T] & FieldSet>> {
  return table(name).find(id)
}

export async function createRecord<T extends TableName>(
  name: T,
  fields: Partial<TableFieldMap[T]>,
): Promise<AirtableRecord<TableFieldMap[T] & FieldSet>> {
  return table(name).create(fields as TableFieldMap[T] & FieldSet)
}

export async function updateRecord<T extends TableName>(
  name: T,
  id: string,
  fields: Partial<TableFieldMap[T]>,
): Promise<AirtableRecord<TableFieldMap[T] & FieldSet>> {
  return table(name).update(id, fields as Partial<TableFieldMap[T] & FieldSet>)
}

/**
 * Lightweight connectivity check. Tries to fetch one record from the
 * Projects table. Returns ok=true on success; ok=false plus error message
 * on failure (env var missing, base inaccessible, table missing, etc).
 */
export async function pingAirtable(): Promise<{ ok: boolean; error?: string }> {
  try {
    await table(TABLES.PROJECTS).select({ maxRecords: 1 }).firstPage()
    return { ok: true }
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : String(err) }
  }
}
