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

export type InboxUrgency = "now" | "today" | "this-week"

export type InboxItemAction = {
  label: string
  href: string
  /** Style hint for the row's primary CTA. */
  variant?: "primary" | "ghost"
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
}

/** Per-device state that overrides what generators emit. */
export type InboxItemState =
  | { kind: "new" }
  | { kind: "snoozed"; until: string }
  | { kind: "done"; at: string }
  | { kind: "waiting"; for: string; chaseAfter: string }
