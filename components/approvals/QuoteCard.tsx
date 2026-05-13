"use client"

import { useState } from "react"
import type { QuoteApproval } from "@/lib/airtable/quotes"

type Props = {
  quote: QuoteApproval
  onApprove: (id: string, supplier: string, amount: number) => Promise<void>
  onReject: (id: string, supplier: string) => Promise<void>
}

function formatCurrency(n: number) {
  return n.toLocaleString("en-AU", { style: "currency", currency: "AUD", maximumFractionDigits: 0 })
}

export function QuoteCard({ quote, onApprove, onReject }: Props) {
  const [loading, setLoading] = useState<"approve" | "reject" | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [done, setDone] = useState(false)

  const act = async (key: "approve" | "reject", fn: () => Promise<void>) => {
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

  if (done) {
    return (
      <div className="rounded-lg border border-rule bg-surface-2 p-4 opacity-60">
        <p className="text-sm text-muted">{quote.supplier} — actioned</p>
      </div>
    )
  }

  return (
    <div className="rounded-lg border border-rule bg-surface-2 p-4">
      <div className="mb-1 flex items-start justify-between gap-2">
        <p className="text-sm font-semibold text-cream">{quote.supplier}</p>
        <span className="shrink-0 text-sm font-medium text-fg">
          {formatCurrency(quote.amount)}
        </span>
      </div>

      {quote.submittedAt && (
        <p className="mb-3 text-xs text-muted">
          Submitted {new Date(quote.submittedAt).toLocaleDateString("en-AU")}
        </p>
      )}

      {error && <p className="mb-2 text-xs text-red-400">{error}</p>}

      <div className="flex gap-2">
        <button
          disabled={loading !== null}
          onClick={() =>
            act("approve", () => onApprove(quote.id, quote.supplier, quote.amount))
          }
          className="rounded-md bg-green-700 px-3 py-1.5 text-xs font-medium text-white hover:bg-green-600 disabled:opacity-50"
        >
          {loading === "approve" ? "Approving..." : "Approve"}
        </button>

        <button
          disabled={loading !== null}
          onClick={() => act("reject", () => onReject(quote.id, quote.supplier))}
          className="rounded-md border border-rule px-3 py-1.5 text-xs font-medium text-red-400 hover:border-red-700 disabled:opacity-50"
        >
          {loading === "reject" ? "Rejecting..." : "Reject"}
        </button>
      </div>
    </div>
  )
}
