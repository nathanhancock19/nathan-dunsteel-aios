"use client"

import type { QuoteApproval } from "@/lib/airtable/quotes"
import { QuoteCard } from "./QuoteCard"

type Props = {
  quotes: QuoteApproval[]
}

export function QuoteList({ quotes }: Props) {
  const handleApprove = async (id: string, supplier: string, amount: number) => {
    const res = await fetch(`/api/quotes/${id}/approve`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ supplier, amount }),
    })
    if (!res.ok) {
      const body = await res.json()
      throw new Error(body.error ?? "Failed to approve")
    }
  }

  const handleReject = async (id: string, supplier: string) => {
    const res = await fetch(`/api/quotes/${id}/reject`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ supplier }),
    })
    if (!res.ok) {
      const body = await res.json()
      throw new Error(body.error ?? "Failed to reject")
    }
  }

  if (quotes.length === 0) {
    return <p className="text-sm text-neutral-500">No quotes waiting on you.</p>
  }

  return (
    <div className="space-y-3">
      {quotes.map((q) => (
        <QuoteCard
          key={q.id}
          quote={q}
          onApprove={handleApprove}
          onReject={handleReject}
        />
      ))}
    </div>
  )
}
