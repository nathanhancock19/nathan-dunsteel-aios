"use client"

import { useState } from "react"
import type { MondayBoardItem, ColumnOption } from "@/lib/monday"
import type { ApprovePayload, AllocationSuggestion } from "./POList"

type Props = {
  item: MondayBoardItem
  jobScopeOptions: ColumnOption[]
  costCodeOptions: ColumnOption[]
  suggestion?: AllocationSuggestion
  onApprove: (id: string, name: string, alloc?: ApprovePayload) => Promise<void>
  onQuery: (id: string, name: string, message: string) => Promise<void>
}

function col(item: MondayBoardItem, id: string): string {
  return item.column_values.find((c) => c.id === id)?.text ?? ""
}

function buildSuggestionLabel(
  s: AllocationSuggestion,
  jobScopeOptions: ColumnOption[],
): string | null {
  const parts: string[] = []
  if (s.jobScopeId !== null) {
    const match = jobScopeOptions.find((o) => o.id === s.jobScopeId)
    if (match) parts.push(match.label)
  }
  if (s.costCodeLabel) parts.push(s.costCodeLabel)
  if (parts.length === 0) return null
  const conf = Math.round(s.confidence * 100)
  return `${parts.join(" / ")} (${conf}% match, last 90d)`
}

export function POCard({
  item,
  jobScopeOptions,
  costCodeOptions,
  suggestion,
  onApprove,
  onQuery,
}: Props) {
  const [loading, setLoading] = useState<"approve" | "query" | null>(null)
  const [showQuery, setShowQuery] = useState(false)
  const [queryMsg, setQueryMsg] = useState("")
  const [error, setError] = useState<string | null>(null)
  const [done, setDone] = useState(false)

  const status = col(item, "status")
  const date = col(item, "date__1")
  const costCode = col(item, "single_select")
  const jobScope = col(item, "multi_select6")
  const additionalComments = col(item, "long_text_mkrv1x66")

  // Pre-select existing values on the dropdowns when allocation panel opens.
  // If the PO has no current allocation but a supplier-learning suggestion
  // exists, use the suggestion as the initial picker value.
  const initialJobScopeId = (() => {
    if (jobScope) {
      const match = jobScopeOptions.find((o) => o.label === jobScope)
      if (match) return match.id.toString()
    }
    if (suggestion?.jobScopeId !== null && suggestion?.jobScopeId !== undefined) {
      return suggestion.jobScopeId.toString()
    }
    return ""
  })()
  const initialCostCode = costCode || suggestion?.costCodeLabel || ""

  const [jobScopeId, setJobScopeId] = useState<string>(initialJobScopeId)
  const [costCodeLabel, setCostCodeLabel] = useState<string>(initialCostCode)

  const suggestionLabel = suggestion
    ? buildSuggestionLabel(suggestion, jobScopeOptions)
    : null

  const act = async (key: "approve" | "query", fn: () => Promise<void>) => {
    setLoading(key)
    setError(null)
    try {
      await fn()
      setDone(true)
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err))
    } finally {
      setLoading(null)
    }
  }

  const buildAllocPayload = (): ApprovePayload => {
    const alloc: ApprovePayload = {}
    if (jobScopeId !== "" && jobScopeId !== initialJobScopeId) {
      alloc.jobScopeId = Number(jobScopeId)
    }
    if (costCodeLabel !== "" && costCodeLabel !== initialCostCode) {
      alloc.costCodeLabel = costCodeLabel
    }
    return alloc
  }

  if (done) {
    return (
      <div className="rounded-lg border border-rule bg-surface-2 p-4 opacity-60">
        <p className="text-sm text-muted">{item.name} — actioned</p>
      </div>
    )
  }

  return (
    <div className="rounded-lg border border-rule bg-surface-2 p-4">
      <div className="mb-1 flex items-start justify-between gap-2">
        <p className="text-sm font-semibold text-cream">{item.name}</p>
        {status && (
          <span className="shrink-0 rounded-full bg-yellow-900 px-2 py-0.5 text-xs font-medium text-yellow-300">
            {status}
          </span>
        )}
      </div>

      <div className="mb-3 space-y-0.5 text-xs text-muted">
        {date && (
          <p>
            <span className="text-fg-subtle">Invoice Date:</span> {date}
          </p>
        )}
        <p>
          <a
            href={`/api/monday/pos/${item.id}/pdf`}
            target="_blank"
            rel="noreferrer"
            className="text-fg underline hover:text-amber-300"
          >
            View invoice PDF
          </a>
        </p>
      </div>

      {additionalComments && (
        <div className="mb-3 rounded-md border border-rule bg-ink px-3 py-2 text-xs leading-relaxed text-muted">
          <p className="mb-1 text-[10px] font-medium uppercase tracking-wider text-fg-subtle">
            Additional comments
          </p>
          <p className="whitespace-pre-wrap text-fg-muted">{additionalComments}</p>
        </div>
      )}

      {/* Inline allocation - always visible so Nathan can change Job/Scope + Cost Code
          directly before clicking Approve, no extra panel toggle. */}
      <div className="mb-3 space-y-2 rounded-md border border-rule bg-ink/60 p-3">
        <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
          <div className="space-y-1">
            <label className="block text-[10px] font-medium uppercase tracking-wider text-muted">
              Job / Scope
            </label>
            <select
              value={jobScopeId}
              onChange={(e) => setJobScopeId(e.target.value)}
              className="w-full rounded-md border border-rule bg-surface-2 px-2 py-1.5 text-xs text-cream focus:outline-none focus:ring-1 focus:ring-fg-muted"
            >
              <option value="">{jobScope || "— Unallocated —"}</option>
              {jobScopeOptions.map((opt) => (
                <option key={opt.id} value={opt.id}>
                  {opt.label}
                </option>
              ))}
            </select>
          </div>

          <div className="space-y-1">
            <label className="block text-[10px] font-medium uppercase tracking-wider text-muted">
              Cost Code
            </label>
            <select
              value={costCodeLabel}
              onChange={(e) => setCostCodeLabel(e.target.value)}
              className="w-full rounded-md border border-rule bg-surface-2 px-2 py-1.5 text-xs text-cream focus:outline-none focus:ring-1 focus:ring-fg-muted"
            >
              <option value="">{costCode || "— Unallocated —"}</option>
              {costCodeOptions.map((opt) => (
                <option key={opt.id} value={opt.label}>
                  {opt.label}
                </option>
              ))}
            </select>
          </div>
        </div>
        {suggestionLabel && (
          <p className="text-[11px] text-amber-300/80">
            Suggested: {suggestionLabel}
          </p>
        )}
      </div>

      {error && <p className="mb-2 text-xs text-red-400">{error}</p>}

      {!showQuery && (
        <div className="flex flex-wrap gap-2">
          <button
            disabled={loading !== null}
            onClick={() =>
              act("approve", () =>
                onApprove(item.id, item.name, buildAllocPayload()),
              )
            }
            className="rounded-md bg-green-700 px-3 py-1.5 text-xs font-medium text-white hover:bg-green-600 disabled:opacity-50"
          >
            {loading === "approve" ? "Approving..." : "Approve"}
          </button>

          <button
            disabled={loading !== null}
            onClick={() => setShowQuery(true)}
            className="rounded-md border border-rule px-3 py-1.5 text-xs font-medium text-fg-muted hover:border-fg-muted disabled:opacity-50"
          >
            Query
          </button>
        </div>
      )}

      {showQuery && (
        <div className="mt-1 space-y-2">
          <textarea
            value={queryMsg}
            onChange={(e) => setQueryMsg(e.target.value)}
            placeholder="What needs clarification? (optional)"
            rows={2}
            className="w-full rounded-md border border-rule bg-surface-3 px-3 py-2 text-sm text-cream placeholder-fg-subtle focus:outline-none focus:ring-1 focus:ring-fg-muted"
          />
          <div className="flex gap-2">
            <button
              disabled={loading !== null}
              onClick={() =>
                act("query", async () => {
                  await onQuery(item.id, item.name, queryMsg)
                  setShowQuery(false)
                  setQueryMsg("")
                })
              }
              className="rounded-md bg-blue-700 px-3 py-1.5 text-xs font-medium text-white hover:bg-blue-600 disabled:opacity-50"
            >
              {loading === "query" ? "Sending..." : "Send Query"}
            </button>
            <button
              onClick={() => setShowQuery(false)}
              className="text-xs text-muted hover:text-cream"
            >
              Cancel
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
