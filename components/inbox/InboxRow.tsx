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
        ? "rounded-md bg-signal px-3 py-1.5 text-xs font-medium text-ink hover:bg-signal-300"
        : "rounded-md border border-rule px-3 py-1.5 text-xs font-medium text-cream hover:border-muted"
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
    <div className="border-b border-rule py-3 first:pt-2 last:border-b-0">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <div className="mb-1 flex items-center gap-2">
            <span className="label">{badge}</span>
            {waitingNote && (
              <span className="rounded-full bg-rule px-2 py-0.5 text-[10px] text-muted">
                waiting · {waitingNote}
              </span>
            )}
          </div>
          <p className="truncate text-sm font-medium text-cream">{item.title}</p>
          {item.context && (
            <p className="mt-0.5 truncate text-xs text-muted">{item.context}</p>
          )}
        </div>

        <div className="flex shrink-0 items-center gap-1">
          {primary && actionWrapper(primary.href, primary.label, primary.variant)}
          <button
            type="button"
            onClick={() => setShowMore((v) => !v)}
            aria-label="More actions"
            className="rounded-md border border-rule px-2 py-1.5 text-xs text-muted hover:border-muted hover:text-cream"
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
            className="rounded-md border border-rule px-3 py-1 text-xs text-muted hover:border-muted hover:text-cream"
          >
            Mark done
          </button>
          <button
            onClick={() => handleSnooze(24)}
            className="rounded-md border border-rule px-3 py-1 text-xs text-muted hover:border-muted hover:text-cream"
          >
            Snooze 24h
          </button>
          <button
            onClick={handleWaiting}
            className="rounded-md border border-rule px-3 py-1 text-xs text-muted hover:border-muted hover:text-cream"
          >
            Waiting on...
          </button>
        </div>
      )}
    </div>
  )
}
