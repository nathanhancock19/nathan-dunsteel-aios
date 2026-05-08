"use client"

import { useState, type ReactNode } from "react"

type TabKey = "inbox" | "snapshot"

type Props = {
  inbox: ReactNode
  snapshot: ReactNode
}

export function DashboardTabs({ inbox, snapshot }: Props) {
  const [active, setActive] = useState<TabKey>("inbox")
  return (
    <div>
      <div className="mb-4 flex gap-1 border-b border-rule">
        <TabButton
          label="Inbox"
          active={active === "inbox"}
          onClick={() => setActive("inbox")}
        />
        <TabButton
          label="Snapshot"
          active={active === "snapshot"}
          onClick={() => setActive("snapshot")}
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
          ? "border-signal text-cream"
          : "border-transparent text-muted hover:text-cream"
      }`}
    >
      {label}
    </button>
  )
}
