"use client"

import Link from "next/link"
import { useState } from "react"
import type { InboxItem, InboxItemState } from "@/lib/inbox/types"
import { markDone, markWaiting, snooze } from "@/lib/inbox/state"

const SOURCE_BADGE: Record<string, string> = {
  "monday-po": "PO",
  "sheets-delivery": "DELIVERY",
  "notion-diary": "DIARY",
  "docket-app": "DOCKET",
}

type Props = {
  item: InboxItem
  state: InboxItemState
  onChange: () => void
}

export function InboxRow({ item, state, onChange }: Props) {
  const [showMore, setShowMore] = useState(false)

  const badge = SOURCE_BADGE[item.source] ?? item.source.toUpperCase()
  const primary = item.actions[0]
  const secondaries = item.actions.slice(1)

  function isExternal(href: string): boolean {
    return /^https?:\/\//.test(href)
  }

  function actionWrapper(href: string, label: string, variant?: string) {
    const className =
      variant === "primary"
        ? "rounded-md bg-orange-500 px-3 py-1.5 text-xs font-medium text-neutral-950 hover:bg-orange-400"
        : "rounded-md border border-neutral-700 px-3 py-1.5 text-xs font-medium text-neutral-300 hover:border-neutral-500"
    if (isExternal(href)) {
      return (
        <a key={href} href={href} target="_blank" rel="noreferrer" className={className}>
          {label}
        </a>
      )
    }
    return (
      <Link key={href} href={href} className={className}>
        {label}
      </Link>
    )
  }

  function handleSnooze(hours: number) {
    snooze(item.id, hours)
    onChange()
  }
  function handleDone() {
    markDone(item.id)
    onChange()
  }
  function handleWaiting() {
    const waitingFor = window.prompt("Waiting on whom or what?", "")
    if (!waitingFor) return
    markWaiting(item.id, waitingFor.trim(), 3)
    onChange()
  }

  const waitingNote = state.kind === "waiting" ? state.for : null

  return (
    <div className="border-b border-neutral-900 py-3 first:pt-0 last:border-b-0">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <div className="mb-1 flex items-center gap-2 text-[10px] font-medium uppercase tracking-wider text-neutral-500">
            <span>{badge}</span>
            {waitingNote && (
              <span className="rounded-full bg-neutral-800 px-2 py-0.5 text-[10px] text-neutral-400">
                waiting · {waitingNote}
              </span>
            )}
          </div>
          <p className="truncate text-sm font-medium text-neutral-100">{item.title}</p>
          {item.context && (
            <p className="mt-0.5 truncate text-xs text-neutral-500">{item.context}</p>
          )}
        </div>

        <div className="flex shrink-0 items-center gap-1">
          {primary && actionWrapper(primary.href, primary.label, primary.variant)}
          <button
            type="button"
            onClick={() => setShowMore((v) => !v)}
            aria-label="More actions"
            className="rounded-md border border-neutral-800 px-2 py-1.5 text-xs text-neutral-500 hover:border-neutral-700 hover:text-neutral-300"
          >
            ...
          </button>
        </div>
      </div>

      {showMore && (
        <div className="mt-3 flex flex-wrap gap-2 pl-0">
          {secondaries.map((a) => actionWrapper(a.href, a.label, a.variant))}
          <button
            onClick={handleDone}
            className="rounded-md border border-neutral-800 px-3 py-1 text-xs text-neutral-400 hover:border-neutral-700 hover:text-neutral-200"
          >
            Mark done
          </button>
          <button
            onClick={() => handleSnooze(24)}
            className="rounded-md border border-neutral-800 px-3 py-1 text-xs text-neutral-400 hover:border-neutral-700 hover:text-neutral-200"
          >
            Snooze 24h
          </button>
          <button
            onClick={handleWaiting}
            className="rounded-md border border-neutral-800 px-3 py-1 text-xs text-neutral-400 hover:border-neutral-700 hover:text-neutral-200"
          >
            Waiting on...
          </button>
        </div>
      )}
    </div>
  )
}
