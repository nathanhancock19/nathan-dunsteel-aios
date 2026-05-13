/**
 * Inbox model — the unified "what needs me today" surface.
 *
 * Each item is generated from a source system (Monday, Sheets, Notion,
 * Airtable). Generators must be idempotent: if Nathan actions an item
 * elsewhere (e.g. approves a PO directly in Monday), the next inbox
 * refresh should drop the item from the list.
 *
 * Per-device state (snooze, done, waiting) lives in localStorage and is
 * applied client-side to the raw generator output.
 */

export type InboxSource =
  | "monday-po"
  | "sheets-delivery"
  | "notion-diary"
  | "docket-app"
  | "outlook"

export type InboxUrgency = "now" | "today" | "this-week"

export type InboxItemAction = {
  label: string
  href: string
  /** Style hint for the row's primary CTA. */
  variant?: "primary" | "ghost"
}

/**
 * Claude-scored relevance for an inbox item.
 *
 * - "high"   — needs attention today; ties to active project state.
 * - "medium" — relevant this week; collapsed by default on dashboard.
 * - "drop"   — FYI / duplicate / automated noise; hidden by default.
 *
 * `reason` is a one-line justification, max 12 words. Mutated in place
 * on the InboxItem by triageInboxItems().
 */
export type TriageScore = {
  score: "high" | "medium" | "drop"
  reason: string
}

export type InboxItem = {
  /** Stable across generator runs. Source + business id (e.g. "monday-po:12345"). */
  id: string
  source: InboxSource
  urgency: InboxUrgency
  /** Headline — supplier name + amount, project + delivery, etc. */
  title: string
  /** Subtitle context: "Inv 30/4 · suggested Project 224-01". */
  context?: string
  /** When the underlying record entered the system (ISO string). */
  createdAt?: string
  /** Tap-through to source. Either a deep link in the app or external. */
  actions: InboxItemAction[]
  /** Source-specific payload for downstream renderers / debugging. */
  raw?: Record<string, unknown>
  /** Claude triage scoring; null until triageInboxItems() has run. */
  triage?: TriageScore | null
}

/** Per-device state that overrides what generators emit. */
export type InboxItemState =
  | { kind: "new" }
  | { kind: "snoozed"; until: string }
  | { kind: "done"; at: string }
  | { kind: "waiting"; for: string; chaseAfter: string }
