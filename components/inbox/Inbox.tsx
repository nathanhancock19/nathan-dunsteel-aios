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

  // Apply per-device state. stateTick is the manual signal to re-read
  // localStorage after a snooze/done/waiting action.
  const visible = useMemo(() => {
    if (!items) return []
    const states = getAllStates()
    return items.filter((i) => {
      const s = states[i.id] ?? { kind: "new" as const }
      return isVisible(s)
    })
    // eslint-disable-next-line react-hooks/exhaustive-deps
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
      <div className="rounded-md border border-red-900/60 bg-red-950/40 px-4 py-3 text-sm text-red-300">
        Inbox error: {error}
      </div>
    )
  }

  if (items === null) {
    return (
      <div className="space-y-2">
        {[1, 2, 3].map((i) => (
          <div key={i} className="h-12 animate-pulse rounded-md bg-rule/60" />
        ))}
      </div>
    )
  }

  if (visible.length === 0) {
    return (
      <div className="rounded-lg border border-rule bg-ink/60 px-4 py-10 text-center">
        <p className="text-sm font-medium text-cream">You&apos;re clear.</p>
        <p className="mt-1 text-xs text-muted">
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
    <div className="overflow-hidden rounded-lg border border-rule bg-ink/60">
      {(Object.keys(URGENCY_LABEL) as InboxUrgency[]).map((tier) => {
        const tierItems = grouped[tier]
        if (tierItems.length === 0) return null
        const visibleInTier =
          totalShown <= VISIBLE_CAP ? tierItems : tierItems.slice(0, Math.max(0, VISIBLE_CAP))
        return (
          <div key={tier} className="border-b border-rule last:border-b-0">
            <div className="flex items-center justify-between px-4 pt-3">
              <p className="label">{URGENCY_LABEL[tier]}</p>
              <p className="mono-nums text-[10px] text-muted">{tierItems.length}</p>
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
        <div className="border-t border-rule px-4 py-2 text-center text-xs text-muted">
          +{overflow} more, prioritising urgent items
        </div>
      )}
      <div className="border-t border-rule px-4 py-2">
        <button
          onClick={() => setRefreshTick((t) => t + 1)}
          className="label hover:text-cream"
        >
          Refresh
        </button>
      </div>
    </div>
  )
}
