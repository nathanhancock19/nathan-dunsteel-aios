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
  const [showAllocate, setShowAllocate] = useState(false)
  const [queryMsg, setQueryMsg] = useState("")
  const [error, setError] = useState<string | null>(null)
  const [done, setDone] = useState(false)

  const status = col(item, "status")
  const date = col(item, "date__1")
  const costCode = col(item, "single_select")
  const jobScope = col(item, "multi_select6")
  const additionalComments = col(item, "long_text_mkrv1x66")
  const invoiceUrl = item.column_values.find((c) => c.id === "upload_file")?.text ?? ""

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
      <div className="rounded-lg border border-neutral-800 bg-neutral-900 p-4 opacity-60">
        <p className="text-sm text-neutral-400">{item.name} — actioned</p>
      </div>
    )
  }

  return (
    <div className="rounded-lg border border-neutral-800 bg-neutral-900 p-4">
      <div className="mb-1 flex items-start justify-between gap-2">
        <p className="text-sm font-semibold text-neutral-100">{item.name}</p>
        {status && (
          <span className="shrink-0 rounded-full bg-yellow-900 px-2 py-0.5 text-xs font-medium text-yellow-300">
            {status}
          </span>
        )}
      </div>

      <div className="mb-3 space-y-0.5 text-xs text-neutral-500">
        {jobScope && (
          <p>
            <span className="text-neutral-600">Job/Scope:</span> {jobScope}
          </p>
        )}
        {costCode && (
          <p>
            <span className="text-neutral-600">Cost Code:</span> {costCode}
          </p>
        )}
        {date && (
          <p>
            <span className="text-neutral-600">Invoice Date:</span> {date}
          </p>
        )}
        {invoiceUrl && invoiceUrl.startsWith("http") && (
          <p>
            <a
              href={invoiceUrl}
              target="_blank"
              rel="noreferrer"
              className="text-fg hover:text-fg"
            >
              View invoice PDF
            </a>
          </p>
        )}
      </div>

      {additionalComments && (
        <div className="mb-3 rounded-md border border-neutral-800 bg-neutral-950 px-3 py-2 text-xs leading-relaxed text-neutral-400">
          <p className="mb-1 text-[10px] font-medium uppercase tracking-wider text-neutral-600">
            Additional comments
          </p>
          <p className="whitespace-pre-wrap text-neutral-300">{additionalComments}</p>
        </div>
      )}

      {suggestionLabel && !showAllocate && (
        <p className="mb-3 text-xs text-fg/80">
          Suggested: {suggestionLabel}
        </p>
      )}

      {error && <p className="mb-2 text-xs text-red-400">{error}</p>}

      {!showAllocate && !showQuery && (
        <div className="flex flex-wrap gap-2">
          <button
            disabled={loading !== null}
            onClick={() => setShowAllocate(true)}
            className="rounded-md bg-green-700 px-3 py-1.5 text-xs font-medium text-white hover:bg-green-600 disabled:opacity-50"
          >
            Approve
          </button>

          <button
            disabled={loading !== null}
            onClick={() => setShowQuery(true)}
            className="rounded-md border border-neutral-700 px-3 py-1.5 text-xs font-medium text-neutral-300 hover:border-neutral-500 disabled:opacity-50"
          >
            Query
          </button>
        </div>
      )}

      {showAllocate && (
        <div className="mt-1 space-y-3 rounded-md border border-neutral-800 bg-neutral-950 p-3">
          <p className="text-[10px] font-medium uppercase tracking-wider text-neutral-500">
            Allocate before approving (optional)
          </p>

          <div className="space-y-1">
            <label className="block text-xs text-neutral-400">Job / Scope</label>
            <select
              value={jobScopeId}
              onChange={(e) => setJobScopeId(e.target.value)}
              className="w-full rounded-md border border-neutral-700 bg-neutral-900 px-2 py-1.5 text-xs text-neutral-100 focus:outline-none focus:ring-1 focus:ring-fg-muted"
            >
              <option value="">— Leave unchanged —</option>
              {jobScopeOptions.map((opt) => (
                <option key={opt.id} value={opt.id}>
                  {opt.label}
                </option>
              ))}
            </select>
          </div>

          <div className="space-y-1">
            <label className="block text-xs text-neutral-400">Cost Code</label>
            <select
              value={costCodeLabel}
              onChange={(e) => setCostCodeLabel(e.target.value)}
              className="w-full rounded-md border border-neutral-700 bg-neutral-900 px-2 py-1.5 text-xs text-neutral-100 focus:outline-none focus:ring-1 focus:ring-fg-muted"
            >
              <option value="">— Leave unchanged —</option>
              {costCodeOptions.map((opt) => (
                <option key={opt.id} value={opt.label}>
                  {opt.label}
                </option>
              ))}
            </select>
          </div>

          <div className="flex flex-wrap gap-2 pt-1">
            <button
              disabled={loading !== null}
              onClick={() =>
                act("approve", () =>
                  onApprove(item.id, item.name, buildAllocPayload()),
                )
              }
              className="rounded-md bg-green-700 px-3 py-1.5 text-xs font-medium text-white hover:bg-green-600 disabled:opacity-50"
            >
              {loading === "approve" ? "Approving..." : "Confirm approval"}
            </button>
            <button
              disabled={loading !== null}
              onClick={() => {
                setShowAllocate(false)
                setJobScopeId(initialJobScopeId)
                setCostCodeLabel(initialCostCode)
              }}
              className="text-xs text-neutral-500 hover:text-neutral-300"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {showQuery && (
        <div className="mt-1 space-y-2">
          <textarea
            value={queryMsg}
            onChange={(e) => setQueryMsg(e.target.value)}
            placeholder="What needs clarification? (optional)"
            rows={2}
            className="w-full rounded-md border border-neutral-700 bg-neutral-800 px-3 py-2 text-sm text-neutral-100 placeholder-neutral-600 focus:outline-none focus:ring-1 focus:ring-fg-muted"
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
              className="rounded-md bg-fg px-3 py-1.5 text-xs font-medium text-white hover:bg-fg disabled:opacity-50"
            >
              {loading === "query" ? "Sending..." : "Send Query"}
            </button>
            <button
              onClick={() => setShowQuery(false)}
              className="text-xs text-neutral-500 hover:text-neutral-300"
            >
              Cancel
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
