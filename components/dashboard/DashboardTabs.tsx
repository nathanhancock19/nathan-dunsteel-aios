"use client"

import { useEffect, useState, type ReactNode } from "react"
import { useSearchParams } from "next/navigation"

type TabKey = "inbox" | "snapshot"

type Props = {
  inbox: ReactNode
  snapshot: ReactNode
}

function parseTab(value: string | null): TabKey {
  // Default to "snapshot" — inbox is slower to load (Monday/Outlook/Notion
  // fan-out + Claude triage), and Nathan opens the dashboard wanting the
  // overview first. Sidebar link explicitly passes ?tab=inbox.
  return value === "inbox" ? "inbox" : "snapshot"
}

export function DashboardTabs({ inbox, snapshot }: Props) {
  const searchParams = useSearchParams()
  const [active, setActive] = useState<TabKey>(() => parseTab(searchParams.get("tab")))

  // Re-sync when the sidebar link changes ?tab= while we're already on /dashboard.
  useEffect(() => {
    setActive(parseTab(searchParams.get("tab")))
  }, [searchParams])

  return (
    <div>
      <div className="mb-4 flex gap-1 border-b border-rule">
        <TabButton
          label="Snapshot"
          active={active === "snapshot"}
          onClick={() => setActive("snapshot")}
        />
        <TabButton
          label="Inbox"
          active={active === "inbox"}
          onClick={() => setActive("inbox")}
        />
      </div>
      <div>{active === "inbox" ? inbox : snapshot}</div>
    </div>
  )
}

function TabButton({
  label,
  active,
  onClick,
}: {
  label: string
  active: boolean
  onClick: () => void
}) {
  return (
    <button
      onClick={onClick}
      className={`-mb-px border-b px-4 py-2 text-xs font-medium uppercase tracking-wider transition ${
        active
          ? "border-border-strong text-cream"
          : "border-transparent text-muted hover:text-cream"
      }`}
    >
      {label}
    </button>
  )
}
