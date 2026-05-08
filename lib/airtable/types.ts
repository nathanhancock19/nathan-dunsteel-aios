/**
 * Typed field shapes for AIOS Airtable tables.
 *
 * These are the fields AIOS reads or writes. Day Docket App has additional
 * fields on shared tables (Projects, Activity Log) which AIOS is unaware of;
 * the typed accessors only surface the columns AIOS cares about.
 *
 * As tables get implemented, fill in fields here. Keep optional anything
 * that may be missing on a record (formula fields, rollups, lookups, etc).
 */

export type ProjectFields = {
  // Existing Day Docket App fields (observed in shared base appG75bF70Uq6ENjJ)
  "Project Number"?: string
  "Strumus Name"?: string
  "PM Assigned"?: string[]
  Status?: string
  "Assigned Companies"?: string[]
  Materials?: unknown
  "Day Dockets"?: string[]

  // AIOS extensions (to be added to the Projects table per spec Section 5)
  Name?: string
  "Original Contract Value"?: number
  "Approved Variations Total"?: number
  "Revised Contract Value"?: number
  "Contract Start Date"?: string
  "Contract End Date"?: string
  "Power BI URL"?: string
}

export type ActivityLogFields = {
  Title?: string
  "Record Type"?: string
  Project?: string[]
  "Created At"?: string
  Notes?: string
}

export type BudgetItemFields = {
  Project: string[]
  Category: string
  "Budget Amount": number
  Notes?: string
}

export type VariationFields = {
  "Variation Number": string
  Project: string[]
  Title: string
  Status: "Pending" | "Approved" | "Rejected"
  Total?: number
  "Created At"?: string
  "Approved At"?: string
}

export type VariationLineItemFields = {
  Variation: string[]
  Description: string
  Quantity: number
  Unit?: string
  Rate: number
  Total?: number
}

export type VariationRateFields = {
  "Item Code": string
  Description: string
  Unit: string
  Rate: number
  Active: boolean
}

export type CommittedCostFields = {
  Project: string[]
  "PO Number"?: string
  Supplier?: string
  Amount: number
  "Synced At"?: string
}

export type DeliveryFields = {
  Project: string[]
  Description: string
  "Scheduled Date": string
  Status: "Scheduled" | "Received" | "Delayed"
  "Received At"?: string
  "Delayed Reason"?: string
}

export type SiteWorksEntryFields = {
  Project: string[]
  Description: string
  Date: string
  Notes?: string
}

export type DeliveryNoteFields = {
  Delivery: string[]
  Note: string
  "Created At"?: string
}

export type DeliveryStatusOverrideFields = {
  Delivery: string[]
  Status: "Received" | "Delayed"
  Reason?: string
  "Created At"?: string
}

export type QuoteApprovalFields = {
  Project: string[]
  Supplier: string
  Amount: number
  Status: "Pending" | "Approved" | "Rejected"
  "Submitted At"?: string
}

export type AIUsageLogFields = {
  Date: string
  "Tokens In": number
  "Tokens Out": number
  Model: string
  Cost?: number
}
