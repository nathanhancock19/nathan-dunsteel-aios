"use client"

import { useState, useCallback } from "react"
import { useRouter } from "next/navigation"
import type { Delivery } from "@/lib/airtable/deliveries"
import { DeliveryCard } from "./DeliveryCard"

type Props = {
  initial: Delivery[]
}

export function DeliveryList({ initial }: Props) {
  const router = useRouter()
  const [deliveries, setDeliveries] = useState<Delivery[]>(initial)

  const handleReceived = useCallback(async (id: string) => {
    const res = await fetch(`/api/deliveries/${id}/received`, { method: "POST" })
    if (!res.ok) throw new Error(await res.text())
    const updated: Delivery = await res.json()
    setDeliveries((prev) => prev.map((d) => (d.id === id ? updated : d)))
    router.refresh()
  }, [router])

  const handleDelayed = useCallback(async (id: string, reason: string) => {
    const res = await fetch(`/api/deliveries/${id}/delayed`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ reason }),
    })
    if (!res.ok) throw new Error(await res.text())
    const updated: Delivery = await res.json()
    setDeliveries((prev) => prev.map((d) => (d.id === id ? updated : d)))
    router.refresh()
  }, [router])

  const handleNote = useCallback(async (id: string, note: string) => {
    const res = await fetch(`/api/deliveries/${id}/note`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ note }),
    })
    if (!res.ok) throw new Error(await res.text())
  }, [])

  if (deliveries.length === 0) {
    return <p className="text-sm text-neutral-500">No deliveries in the next 7 days.</p>
  }

  return (
    <div className="space-y-3">
      {deliveries.map((d) => (
        <DeliveryCard
          key={d.id}
          delivery={d}
          onReceived={handleReceived}
          onDelayed={handleDelayed}
          onNote={handleNote}
        />
      ))}
    </div>
  )
}
