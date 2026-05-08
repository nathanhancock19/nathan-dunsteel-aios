"use client"

import { useState } from "react"
import type { MondayBoardItem } from "@/lib/monday"

type Props = {
  item: MondayBoardItem
  onApprove: (id: string, name: string) => Promise<void>
  onQuery: (id: string, name: string, message: string) => Promise<void>
}

function col(item: MondayBoardItem, id: string): string {
  return item.column_values.find((c) => c.id === id)?.text ?? ""
}

export function POCard({ item, onApprove, onQuery }: Props) {
  const [loading, setLoading] = useState<"approve" | "query" | null>(null)
  const [showQuery, setShowQuery] = useState(false)
  const [queryMsg, setQueryMsg] = useState("")
  const [error, setError] = useState<string | null>(null)
  const [done, setDone] = useState(false)

  const status = col(item, "status")
  const date = col(item, "date__1")
  const supplier = col(item, "single_select")

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

      <div className="mb-3 flex gap-3 text-xs text-neutral-500">
        {supplier && <span>{supplier}</span>}
        {date && <span>{date}</span>}
      </div>

      {error && <p className="mb-2 text-xs text-red-400">{error}</p>}

      <div className="flex flex-wrap gap-2">
        <button
          disabled={loading !== null}
          onClick={() => act("approve", () => onApprove(item.id, item.name))}
          className="rounded-md bg-green-700 px-3 py-1.5 text-xs font-medium text-white hover:bg-green-600 disabled:opacity-50"
        >
          {loading === "approve" ? "Approving..." : "Approve"}
        </button>

        <button
          disabled={loading !== null}
          onClick={() => setShowQuery((v) => !v)}
          className="rounded-md border border-neutral-700 px-3 py-1.5 text-xs font-medium text-neutral-300 hover:border-neutral-500 disabled:opacity-50"
        >
          Query
        </button>
      </div>

      {showQuery && (
        <div className="mt-3 space-y-2">
          <textarea
            value={queryMsg}
            onChange={(e) => setQueryMsg(e.target.value)}
            placeholder="What needs clarification? (optional)"
            rows={2}
            className="w-full rounded-md border border-neutral-700 bg-neutral-800 px-3 py-2 text-sm text-neutral-100 placeholder-neutral-600 focus:outline-none focus:ring-1 focus:ring-orange-500"
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
              className="rounded-md bg-orange-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-orange-500 disabled:opacity-50"
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
