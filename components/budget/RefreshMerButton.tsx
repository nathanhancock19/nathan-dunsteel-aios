"use client"
import { useRouter } from "next/navigation"
import { useState } from "react"

export function RefreshMerButton() {
  const router = useRouter()
  const [pending, setPending] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function refresh() {
    setPending(true)
    setError(null)
    try {
      const res = await fetch("/api/sync/mer", { method: "POST" })
      if (!res.ok) {
        const body = await res.json().catch(() => ({}))
        setError(body.error ?? `HTTP ${res.status}`)
      } else {
        router.refresh()
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err))
    } finally {
      setPending(false)
    }
  }

  return (
    <div className="flex items-center gap-2">
      {error ? <span className="text-red-300">Error: {error}</span> : null}
      <button
        onClick={refresh}
        disabled={pending}
        className="rounded-md border border-rule px-3 py-1 text-xs font-medium text-cream hover:border-signal disabled:opacity-50"
      >
        {pending ? "Syncing..." : "Sync MER now"}
      </button>
    </div>
  )
}
