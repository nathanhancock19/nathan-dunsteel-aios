"use client"

import { useState } from "react"
import type { Delivery } from "@/lib/airtable/deliveries"

function statusBadge(status: string) {
  const map: Record<string, string> = {
    Scheduled: "bg-neutral-700 text-neutral-200",
    Received: "bg-green-900 text-green-300",
    Delayed: "bg-red-900 text-red-300",
  }
  return map[status] ?? "bg-neutral-700 text-neutral-200"
}

type Props = {
  delivery: Delivery
  onReceived: (id: string) => Promise<void>
  onDelayed: (id: string, reason: string) => Promise<void>
  onNote: (id: string, note: string) => Promise<void>
}

export function DeliveryCard({ delivery, onReceived, onDelayed, onNote }: Props) {
  const [loading, setLoading] = useState<"received" | "delayed" | "note" | null>(null)
  const [showDelay, setShowDelay] = useState(false)
  const [showNote, setShowNote] = useState(false)
  const [delayReason, setDelayReason] = useState("")
  const [noteText, setNoteText] = useState("")
  const [error, setError] = useState<string | null>(null)

  const act = async (key: "received" | "delayed" | "note", fn: () => Promise<void>) => {
    setLoading(key)
    setError(null)
    try {
      await fn()
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err))
    } finally {
      setLoading(null)
    }
  }

  const isActionable = delivery.status === "Scheduled"

  return (
    <div className="rounded-lg border border-neutral-800 bg-neutral-900 p-4">
      <div className="mb-2 flex items-start justify-between gap-2">
        <p className="text-sm font-semibold text-neutral-100">{delivery.description}</p>
        <span
          className={`shrink-0 rounded-full px-2 py-0.5 text-xs font-medium ${statusBadge(delivery.status)}`}
        >
          {delivery.status}
        </span>
      </div>

      <p className="mb-3 text-xs text-neutral-500">{delivery.scheduledDate}</p>

      {delivery.status === "Delayed" && delivery.delayedReason && (
        <p className="mb-3 text-xs text-orange-400">Delayed: {delivery.delayedReason}</p>
      )}

      {error && <p className="mb-2 text-xs text-red-400">{error}</p>}

      {isActionable && (
        <div className="flex flex-wrap gap-2">
          <button
            disabled={loading !== null}
            onClick={() => act("received", () => onReceived(delivery.id))}
            className="rounded-md bg-green-700 px-3 py-1.5 text-xs font-medium text-white hover:bg-green-600 disabled:opacity-50"
          >
            {loading === "received" ? "Marking..." : "Mark Received"}
          </button>

          <button
            disabled={loading !== null}
            onClick={() => setShowDelay((v) => !v)}
            className="rounded-md border border-neutral-700 px-3 py-1.5 text-xs font-medium text-neutral-300 hover:border-neutral-500 disabled:opacity-50"
          >
            Mark Delayed
          </button>

          <button
            disabled={loading !== null}
            onClick={() => setShowNote((v) => !v)}
            className="rounded-md border border-neutral-700 px-3 py-1.5 text-xs font-medium text-neutral-300 hover:border-neutral-500 disabled:opacity-50"
          >
            Add Note
          </button>
        </div>
      )}

      {!isActionable && (
        <button
          disabled={loading !== null}
          onClick={() => setShowNote((v) => !v)}
          className="rounded-md border border-neutral-700 px-3 py-1.5 text-xs font-medium text-neutral-300 hover:border-neutral-500 disabled:opacity-50"
        >
          Add Note
        </button>
      )}

      {showDelay && (
        <div className="mt-3 space-y-2">
          <textarea
            value={delayReason}
            onChange={(e) => setDelayReason(e.target.value)}
            placeholder="Reason for delay..."
            rows={2}
            className="w-full rounded-md border border-neutral-700 bg-neutral-800 px-3 py-2 text-sm text-neutral-100 placeholder-neutral-600 focus:outline-none focus:ring-1 focus:ring-orange-500"
          />
          <div className="flex gap-2">
            <button
              disabled={loading !== null || !delayReason.trim()}
              onClick={() =>
                act("delayed", async () => {
                  await onDelayed(delivery.id, delayReason)
                  setShowDelay(false)
                  setDelayReason("")
                })
              }
              className="rounded-md bg-orange-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-orange-500 disabled:opacity-50"
            >
              {loading === "delayed" ? "Saving..." : "Confirm Delay"}
            </button>
            <button
              onClick={() => setShowDelay(false)}
              className="text-xs text-neutral-500 hover:text-neutral-300"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {showNote && (
        <div className="mt-3 space-y-2">
          <textarea
            value={noteText}
            onChange={(e) => setNoteText(e.target.value)}
            placeholder="Add a note..."
            rows={2}
            className="w-full rounded-md border border-neutral-700 bg-neutral-800 px-3 py-2 text-sm text-neutral-100 placeholder-neutral-600 focus:outline-none focus:ring-1 focus:ring-orange-500"
          />
          <div className="flex gap-2">
            <button
              disabled={loading !== null || !noteText.trim()}
              onClick={() =>
                act("note", async () => {
                  await onNote(delivery.id, noteText)
                  setShowNote(false)
                  setNoteText("")
                })
              }
              className="rounded-md bg-neutral-700 px-3 py-1.5 text-xs font-medium text-neutral-100 hover:bg-neutral-600 disabled:opacity-50"
            >
              {loading === "note" ? "Saving..." : "Save Note"}
            </button>
            <button
              onClick={() => setShowNote(false)}
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
