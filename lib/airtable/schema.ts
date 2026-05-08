/**
 * Central registry of Airtable table names used by AIOS.
 *
 * The shared base is defined by AIRTABLE_BASE_ID and contains both the
 * Day Docket App's existing tables and AIOS-owned tables. Per the AIOS
 * spec Section 5, AIOS-owned tables can be prefixed with `AIOS_` if a
 * collision risk emerges; for now the bare names are used and any rename
 * happens here.
 */

export const TABLES = {
  // Day Docket App tables (read-mostly from AIOS)
  PROJECTS: "Projects",
  ACTIVITY_LOG: "Activity Log",
  DOCKETS: "Dockets",

  // AIOS-owned tables (Section 5 of the spec)
  BUDGET_ITEMS: "BudgetItems",
  VARIATIONS: "Variations",
  VARIATION_LINE_ITEMS: "VariationLineItems",
  VARIATION_RATES: "VariationRates",
  COMMITTED_COSTS: "CommittedCosts",
  DELIVERIES: "Deliveries",
  SITE_WORKS_ENTRIES: "SiteWorksEntries",
  DELIVERY_NOTES: "DeliveryNotes",
  DELIVERY_STATUS_OVERRIDES: "DeliveryStatusOverrides",
  QUOTE_APPROVALS: "QuoteApprovals",
  AI_USAGE_LOG: "AIUsageLog",
} as const

export type TableName = (typeof TABLES)[keyof typeof TABLES]

/**
 * Activity Log record-type options. Section 5 of the spec lists the
 * extensions AIOS adds; the existing Day Docket entries are not enumerated
 * here.
 */
export const ACTIVITY_RECORD_TYPES = {
  VARIATION: "Variation",
  BUDGET_ITEM: "BudgetItem",
  PO: "PO",
  QUOTE: "Quote",
  DELIVERY: "Delivery",
  COMMITTED_COST_SYNC: "CommittedCostSync",
} as const
