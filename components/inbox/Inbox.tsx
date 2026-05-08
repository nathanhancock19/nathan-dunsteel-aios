"use client"

import { useEffect, useMemo, useState } from "react"
import type { InboxItem, InboxUrgency } from "@/lib/inbox/types"
import { getAllStates, isVisible } from "@/lib/inbox/state"
import { InboxRow } from "./InboxRow"

const URGENCY_LABEL: Record<InboxUrgency, string> = {
  now: "Now",
  today: "Today",
  "this-week": "This week",
}

const VISIBLE_CAP = 12

export function Inbox() {
  const [items, setItems] = useState<InboxItem[] | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [refreshTick, setRefreshTick] = useState(0)
  // Re-render when localStorage state changes (snooze/done/waiting actions).
  const [stateTick, setStateTick] = useState(0)

  useEffect(() => {
    let cancelled = false
    setError(null)
    fetch("/api/inbox", { cache: "no-store" })
      .then((r) => {
        if (!r.ok) throw new Error(`HTTP ${r.status}`)
        return r.json() as Promise<{ items: InboxItem[] }>
      })
      .then((data) => {
        if (!cancelled) setItems(data.items)
      })
      .catch((err) => {
        if (!cancelled) setError(err instanceof Error ? err.message : String(err))
      })
    return () => {
      cancelled = true
    }
  }, [refreshTick])

  // Apply per-device state.
  const visible = useMemo(() => {
    if (!items) return []
    const states = getAllStates()
    return items.filter((i) => {
      const s = states[i.id] ?? { kind: "new" as const }
      return isVisible(s)
    })
  }, [items, stateTick])

  // Group by urgency.
  const grouped = useMemo(() => {
    const map: Record<InboxUrgency, InboxItem[]> = {
      now: [],
      today: [],
      "this-week": [],
    }
    for (const i of visible) map[i.urgency].push(i)
    return map
  }, [visible])

  const totalShown = visible.length
  const overflow = totalShown - VISIBLE_CAP

  if (error) {
    return (
      <div className="rounded-md border border-red-900 bg-red-950 px-4 py-3 text-sm text-red-300">
        Inbox error: {error}
      </div>
    )
  }

  if (items === null) {
    return (
      <div className="space-y-2">
        {[1, 2, 3].map((i) => (
          <div key={i} className="h-12 animate-pulse rounded-md bg-neutral-900" />
        ))}
      </div>
    )
  }

  if (visible.length === 0) {
    return (
      <div className="rounded-lg border border-neutral-900 bg-neutral-950/50 px-4 py-8 text-center">
        <p className="text-sm text-neutral-400">You&apos;re clear.</p>
        <p className="mt-1 text-xs text-neutral-600">
          {new Date().toLocaleDateString("en-AU", {
            weekday: "long",
            day: "numeric",
            month: "long",
          })}
        </p>
      </div>
    )
  }

  return (
    <div className="overflow-hidden rounded-lg border border-neutral-900 bg-neutral-950/50">
      {(Object.keys(URGENCY_LABEL) as InboxUrgency[]).map((tier) => {
        const tierItems = grouped[tier]
        if (tierItems.length === 0) return null
        const visibleInTier =
          totalShown <= VISIBLE_CAP ? tierItems : tierItems.slice(0, Math.max(0, VISIBLE_CAP))
        return (
          <div key={tier} className="border-b border-neutral-900 last:border-b-0">
            <div className="flex items-center justify-between px-4 pt-3">
              <p className="text-[10px] font-medium uppercase tracking-wider text-neutral-500">
                {URGENCY_LABEL[tier]}
              </p>
              <p className="text-[10px] text-neutral-700">{tierItems.length}</p>
            </div>
            <div className="px-4 pb-2">
              {visibleInTier.map((item) => (
                <InboxRow
                  key={item.id}
                  item={item}
                  state={(getAllStates()[item.id] ?? { kind: "new" })}
                  onChange={() => setStateTick((t) => t + 1)}
                />
              ))}
            </div>
          </div>
        )
      })}
      {overflow > 0 && (
        <div className="border-t border-neutral-900 px-4 py-2 text-center text-xs text-neutral-600">
          +{overflow} more, prioritising urgent items
        </div>
      )}
      <div className="border-t border-neutral-900 px-4 py-2">
        <button
          onClick={() => setRefreshTick((t) => t + 1)}
          className="text-[10px] uppercase tracking-wider text-neutral-600 hover:text-neutral-400"
        >
          Refresh
        </button>
      </div>
    </div>
  )
}
