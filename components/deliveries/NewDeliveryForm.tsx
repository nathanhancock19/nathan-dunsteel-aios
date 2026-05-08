"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"

export function NewDeliveryForm() {
  const router = useRouter()
  const [description, setDescription] = useState("")
  const [scheduledDate, setScheduledDate] = useState("")
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const todayISO = () => {
    const d = new Date()
    const tz = d.getTimezoneOffset() * 60000
    return new Date(d.getTime() - tz).toISOString().slice(0, 10)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!description.trim() || !scheduledDate) return
    setLoading(true)
    setError(null)
    try {
      const res = await fetch("/api/deliveries", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ description: description.trim(), scheduledDate }),
      })
      if (!res.ok) {
        const body = await res.json()
        throw new Error(body.error ?? "Failed to create delivery")
      }
      router.push("/deliveries")
      router.refresh()
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err))
      setLoading(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="max-w-md space-y-4">
      <div>
        <label className="mb-1 block text-sm font-medium text-neutral-300">
          Description
        </label>
        <textarea
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="e.g. Grating panels lot 612-618, 3 packs"
          rows={3}
          required
          className="w-full rounded-md border border-neutral-700 bg-neutral-800 px-3 py-2 text-sm text-neutral-100 placeholder-neutral-600 focus:outline-none focus:ring-1 focus:ring-orange-500"
        />
      </div>

      <div>
        <label className="mb-1 block text-sm font-medium text-neutral-300">
          Scheduled date
        </label>
        <input
          type="date"
          value={scheduledDate}
          min={todayISO()}
          onChange={(e) => setScheduledDate(e.target.value)}
          required
          className="rounded-md border border-neutral-700 bg-neutral-800 px-3 py-2 text-sm text-neutral-100 focus:outline-none focus:ring-1 focus:ring-orange-500"
        />
      </div>

      {error && <p className="text-sm text-red-400">{error}</p>}

      <div className="flex gap-3">
        <button
          type="submit"
          disabled={loading}
          className="rounded-md bg-orange-600 px-4 py-2 text-sm font-medium text-white hover:bg-orange-500 disabled:opacity-50"
        >
          {loading ? "Saving..." : "Add delivery"}
        </button>
        <button
          type="button"
          onClick={() => router.back()}
          className="text-sm text-neutral-500 hover:text-neutral-300"
        >
          Cancel
        </button>
      </div>
    </form>
  )
}
