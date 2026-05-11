"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"

export function QuickNoteButton() {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [title, setTitle] = useState("")
  const [body, setBody] = useState("")
  const [category, setCategory] = useState("General")
  const [priority, setPriority] = useState<"Low" | "Medium" | "High">("Medium")
  const [pending, setPending] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function submit() {
    setPending(true)
    setError(null)
    try {
      const res = await fetch("/api/notes/create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title, body, category, priority, project: process.env.NEXT_PUBLIC_AIOS_PROJECT ?? "411" }),
      })
      if (!res.ok) {
        const e = await res.json().catch(() => ({}))
        setError(e.error ?? `HTTP ${res.status}`)
      } else {
        setOpen(false)
        setTitle("")
        setBody("")
        router.refresh()
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err))
    } finally {
      setPending(false)
    }
  }

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="fixed bottom-20 right-5 z-30 rounded-full border border-signal bg-signal/10 px-4 py-2 text-xs font-medium text-signal shadow-lg hover:bg-signal/20"
      >
        + Note
      </button>
    )
  }

  return (
    <div className="fixed bottom-20 right-5 z-30 w-72 rounded-xl border border-rule bg-ink p-3 shadow-2xl">
      <div className="mb-2 flex items-center justify-between">
        <span className="text-xs font-semibold uppercase tracking-wider text-cream">Quick note</span>
        <button onClick={() => setOpen(false)} className="text-xs text-muted hover:text-cream">x</button>
      </div>
      {error ? <p className="mb-2 text-[11px] text-red-300">{error}</p> : null}
      <input
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        placeholder="Title"
        className="mb-2 w-full rounded border border-rule bg-ink px-2 py-1 text-xs text-cream"
      />
      <textarea
        value={body}
        onChange={(e) => setBody(e.target.value)}
        placeholder="Body (optional)"
        rows={3}
        className="mb-2 w-full rounded border border-rule bg-ink px-2 py-1 text-xs text-cream"
      />
      <div className="mb-2 flex gap-2 text-xs">
        <select
          value={category}
          onChange={(e) => setCategory(e.target.value)}
          className="flex-1 rounded border border-rule bg-ink px-2 py-1 text-cream"
        >
          {["General", "Site", "Commercial", "Delivery", "Safety", "QA", "Programme", "Costing"].map((c) => (
            <option key={c}>{c}</option>
          ))}
        </select>
        <select
          value={priority}
          onChange={(e) => setPriority(e.target.value as "Low" | "Medium" | "High")}
          className="rounded border border-rule bg-ink px-2 py-1 text-cream"
        >
          {["Low", "Medium", "High"].map((p) => (
            <option key={p}>{p}</option>
          ))}
        </select>
      </div>
      <button
        disabled={!title || pending}
        onClick={submit}
        className="w-full rounded border border-signal bg-signal/10 py-1.5 text-xs font-medium text-signal disabled:opacity-50"
      >
        {pending ? "Saving..." : "Save to Notion"}
      </button>
    </div>
  )
}
