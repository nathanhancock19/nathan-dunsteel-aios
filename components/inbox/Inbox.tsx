"use client"

import { useEffect, useMemo, useState } from "react"
import type { InboxItem, InboxUrgency, TriageScore } from "@/lib/inbox/types"
import { getAllStates, isVisible } from "@/lib/inbox/state"
import { InboxRow } from "./InboxRow"

const URGENCY_LABEL: Record<InboxUrgency, string> = {
  now: "Now",
  today: "Today",
  "this-week": "This week",
}

const VISIBLE_CAP = 12

type TriageFilter = "high-only" | "high-and-medium" | "all"

export function Inbox() {
  const [items, setItems] = useState<InboxItem[] | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [refreshTick, setRefreshTick] = useState(0)
  // Re-render when localStorage state changes (snooze/done/waiting actions).
  const [stateTick, setStateTick] = useState(0)
  // Triage view: high-only by default, expand via inline toggles.
  const [filter, setFilter] = useState<TriageFilter>("high-only")

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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [items, stateTick])

  // If any item has triage, switch to triage-grouped mode. Otherwise fall
  // back to urgency tiers (pre-Phase-2 behaviour).
  const hasTriage = useMemo(() => visible.some((i) => i.triage), [visible])

  const triageGroups = useMemo(() => {
    const map: Record<TriageScore["score"] | "untriaged", InboxItem[]> = {
      high: [],
      medium: [],
      drop: [],
      untriaged: [],
    }
    for (const i of visible) {
      if (i.triage) map[i.triage.score].push(i)
      else map.untriaged.push(i)
    }
    return map
  }, [visible])

  const urgencyGroups = useMemo(() => {
    const map: Record<InboxUrgency, InboxItem[]> = {
      now: [],
      today: [],
      "this-week": [],
    }
    for (const i of visible) map[i.urgency].push(i)
    return map
  }, [visible])

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
            timeZone: "Australia/Sydney",
          })}
        </p>
      </div>
    )
  }

  // Triage-mode rendering.
  if (hasTriage) {
    const highCount = triageGroups.high.length
    const medCount = triageGroups.medium.length
    const dropCount = triageGroups.drop.length
    const untriagedCount = triageGroups.untriaged.length

    return (
      <div className="overflow-hidden rounded-lg border border-rule bg-ink/60">
        <TriageSection
          label="High"
          count={highCount}
          items={triageGroups.high}
          stateTick={stateTick}
          onChange={() => setStateTick((t) => t + 1)}
          defaultOpen
        />
        {filter !== "high-only" && (
          <TriageSection
            label="Medium"
            count={medCount}
            items={triageGroups.medium}
            stateTick={stateTick}
            onChange={() => setStateTick((t) => t + 1)}
            defaultOpen={filter === "all"}
          />
        )}
        {filter === "all" && (
          <TriageSection
            label="Drop"
            count={dropCount}
            items={triageGroups.drop}
            stateTick={stateTick}
            onChange={() => setStateTick((t) => t + 1)}
            defaultOpen={false}
          />
        )}
        {untriagedCount > 0 && (
          <TriageSection
            label="Unscored"
            count={untriagedCount}
            items={triageGroups.untriaged}
            stateTick={stateTick}
            onChange={() => setStateTick((t) => t + 1)}
            defaultOpen={highCount === 0}
          />
        )}
        <div className="flex items-center justify-between border-t border-rule px-4 py-2">
          <div className="flex items-center gap-2 text-xs">
            <FilterChip
              active={filter === "high-only"}
              onClick={() => setFilter("high-only")}
              label="High"
              count={highCount}
            />
            <FilterChip
              active={filter === "high-and-medium"}
              onClick={() => setFilter("high-and-medium")}
              label="+ Medium"
              count={medCount}
            />
            <FilterChip
              active={filter === "all"}
              onClick={() => setFilter("all")}
              label="All"
              count={dropCount}
            />
          </div>
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

  // Fallback: urgency-tier grouping (no triage scores available).
  const totalShown = visible.length
  const overflow = totalShown - VISIBLE_CAP

  return (
    <div className="overflow-hidden rounded-lg border border-rule bg-ink/60">
      {(Object.keys(URGENCY_LABEL) as InboxUrgency[]).map((tier) => {
        const tierItems = urgencyGroups[tier]
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
                  state={getAllStates()[item.id] ?? { kind: "new" }}
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

function TriageSection({
  label,
  count,
  items,
  stateTick,
  onChange,
  defaultOpen,
}: {
  label: string
  count: number
  items: InboxItem[]
  stateTick: number
  onChange: () => void
  defaultOpen: boolean
}) {
  const [open, setOpen] = useState(defaultOpen)
  if (count === 0) return null
  return (
    <div className="border-b border-rule last:border-b-0">
      <button
        onClick={() => setOpen((o) => !o)}
        className="flex w-full items-center justify-between px-4 pt-3 pb-1 text-left"
      >
        <p className="label">{label}</p>
        <span className="mono-nums text-[10px] text-muted">
          {count} {open ? "▾" : "▸"}
        </span>
      </button>
      {open && (
        <div className="px-4 pb-2">
          {items.map((item) => (
            <div key={item.id}>
              <InboxRow
                item={item}
                state={getAllStates()[item.id] ?? { kind: "new" }}
                onChange={onChange}
              />
              {item.triage?.reason && (
                <p className="-mt-1 mb-2 ml-1 text-[11px] italic text-muted">
                  {item.triage.reason}
                </p>
              )}
            </div>
          ))}
        </div>
      )}
      {/* stateTick reference for re-render trigger */}
      <span className="hidden">{stateTick}</span>
    </div>
  )
}

function FilterChip({
  active,
  onClick,
  label,
  count,
}: {
  active: boolean
  onClick: () => void
  label: string
  count: number
}) {
  return (
    <button
      onClick={onClick}
      className={`rounded-full border px-2 py-0.5 text-[10px] ${
        active
          ? "border-cream bg-cream/10 text-cream"
          : "border-rule text-muted hover:text-cream"
      }`}
    >
      {label} <span className="mono-nums">{count}</span>
    </button>
  )
}
