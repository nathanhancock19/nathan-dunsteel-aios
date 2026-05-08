/**
 * Airtable service layer for the Deliveries module.
 *
 * Owns: Deliveries, SiteWorksEntries, DeliveryNotes, DeliveryStatusOverrides.
 * All writes go through these helpers so the API routes stay thin.
 */

import { listRecords, findRecord, createRecord, updateRecord } from "./client"
import { TABLES } from "./schema"
import type {
  DeliveryFields,
  DeliveryNoteFields,
} from "./types"
import type { Record as AirtableRecord, FieldSet } from "airtable"

function todayISO(): string {
  const d = new Date()
  const tz = d.getTimezoneOffset() * 60000
  return new Date(d.getTime() - tz).toISOString().slice(0, 10)
}

function projectScope(): string | null {
  return process.env.AIOS_PRIMARY_PROJECT_NUMBER ?? null
}

export type Delivery = {
  id: string
  projectIds: string[]
  description: string
  scheduledDate: string
  status: "Scheduled" | "Received" | "Delayed" | string
  receivedAt?: string
  delayedReason?: string
}

export type DeliveryNote = {
  id: string
  deliveryIds: string[]
  note: string
  createdAt?: string
}

function toDelivery(r: AirtableRecord<DeliveryFields & FieldSet>): Delivery {
  return {
    id: r.id,
    projectIds: Array.isArray(r.fields.Project) ? (r.fields.Project as string[]) : [],
    description: String(r.fields.Description ?? ""),
    scheduledDate: String(r.fields["Scheduled Date"] ?? ""),
    status: String(r.fields.Status ?? "Scheduled"),
    receivedAt: r.fields["Received At"] ? String(r.fields["Received At"]) : undefined,
    delayedReason: r.fields["Delayed Reason"] ? String(r.fields["Delayed Reason"]) : undefined,
  }
}

function toDeliveryNote(r: AirtableRecord<DeliveryNoteFields & FieldSet>): DeliveryNote {
  return {
    id: r.id,
    deliveryIds: Array.isArray(r.fields.Delivery) ? (r.fields.Delivery as string[]) : [],
    note: String(r.fields.Note ?? ""),
    createdAt: r.fields["Created At"] ? String(r.fields["Created At"]) : undefined,
  }
}

/**
 * List deliveries scoped to the primary project.
 * Optionally filter by a date range or status.
 */
export async function listDeliveries(opts?: {
  fromDate?: string
  toDate?: string
  status?: string
}): Promise<Delivery[]> {
  const clauses: string[] = []

  const project = projectScope()
  if (project) {
    clauses.push(`FIND("${project}", ARRAYJOIN({Project}, ","))`)
  }

  if (opts?.fromDate) {
    clauses.push(`{Scheduled Date} >= "${opts.fromDate}"`)
  }
  if (opts?.toDate) {
    clauses.push(`{Scheduled Date} <= "${opts.toDate}"`)
  }
  if (opts?.status) {
    clauses.push(`{Status} = "${opts.status}"`)
  }

  const formula =
    clauses.length === 0
      ? ""
      : clauses.length === 1
      ? clauses[0]
      : `AND(${clauses.join(", ")})`

  const records = await listRecords(TABLES.DELIVERIES, {
    filterByFormula: formula,
    sort: [{ field: "Scheduled Date", direction: "asc" }],
    maxRecords: 100,
  })
  return records.map(toDelivery)
}

/**
 * Get all deliveries for today + next 7 days (default view).
 */
export async function getUpcomingDeliveries(): Promise<Delivery[]> {
  const today = todayISO()
  const d = new Date()
  d.setDate(d.getDate() + 7)
  const weekOut = d.toISOString().slice(0, 10)
  return listDeliveries({ fromDate: today, toDate: weekOut })
}

export async function getDelivery(id: string): Promise<Delivery> {
  const r = await findRecord(TABLES.DELIVERIES, id)
  return toDelivery(r)
}

export async function createDelivery(fields: {
  projectIds: string[]
  description: string
  scheduledDate: string
}): Promise<Delivery> {
  const r = await createRecord(TABLES.DELIVERIES, {
    Project: fields.projectIds,
    Description: fields.description,
    "Scheduled Date": fields.scheduledDate,
    Status: "Scheduled",
  } as Partial<DeliveryFields>)
  return toDelivery(r)
}

export async function markReceived(id: string): Promise<Delivery> {
  const now = new Date().toISOString()
  const r = await updateRecord(TABLES.DELIVERIES, id, {
    Status: "Received",
    "Received At": now,
  } as Partial<DeliveryFields>)
  return toDelivery(r)
}

export async function markDelayed(id: string, reason: string): Promise<Delivery> {
  const r = await updateRecord(TABLES.DELIVERIES, id, {
    Status: "Delayed",
    "Delayed Reason": reason,
  } as Partial<DeliveryFields>)
  return toDelivery(r)
}

export async function addNote(deliveryId: string, note: string): Promise<DeliveryNote> {
  const r = await createRecord(TABLES.DELIVERY_NOTES, {
    Delivery: [deliveryId],
    Note: note,
    "Created At": new Date().toISOString(),
  } as Partial<DeliveryNoteFields>)
  return toDeliveryNote(r)
}

export async function listNotes(deliveryId: string): Promise<DeliveryNote[]> {
  const records = await listRecords(TABLES.DELIVERY_NOTES, {
    filterByFormula: `FIND("${deliveryId}", ARRAYJOIN({Delivery}, ","))`,
    sort: [{ field: "Created At", direction: "desc" }],
    maxRecords: 20,
  })
  return records.map(toDeliveryNote)
}
