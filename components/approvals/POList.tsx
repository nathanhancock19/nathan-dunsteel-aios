"use client"

import type { MondayBoardItem, ColumnOption } from "@/lib/monday"
import { POCard } from "./POCard"

type Props = {
  items: MondayBoardItem[]
  jobScopeOptions: ColumnOption[]
  costCodeOptions: ColumnOption[]
}

export type ApprovePayload = {
  jobScopeId?: number
  costCodeLabel?: string
}

export function POList({ items, jobScopeOptions, costCodeOptions }: Props) {
  const pending = items.filter((i) => {
    const status = i.column_values.find((c) => c.id === "status")?.text ?? ""
    return status.toLowerCase().includes("pending")
  })

  const handleApprove = async (id: string, name: string, alloc?: ApprovePayload) => {
    const res = await fetch(`/api/monday/pos/${id}/approve`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, ...alloc }),
    })
    if (!res.ok) {
      const body = await res.json()
      throw new Error(body.error ?? "Failed to approve")
    }
  }

  const handleQuery = async (id: string, name: string, message: string) => {
    const res = await fetch(`/api/monday/pos/${id}/query`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, message }),
    })
    if (!res.ok) {
      const body = await res.json()
      throw new Error(body.error ?? "Failed to send query")
    }
  }

  if (pending.length === 0) {
    return <p className="text-sm text-neutral-500">No POs waiting on you.</p>
  }

  return (
    <div className="space-y-3">
      {pending.map((item) => (
        <POCard
          key={item.id}
          item={item}
          jobScopeOptions={jobScopeOptions}
          costCodeOptions={costCodeOptions}
          onApprove={handleApprove}
          onQuery={handleQuery}
        />
      ))}
    </div>
  )
}
