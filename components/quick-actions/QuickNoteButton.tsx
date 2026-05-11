"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Plus, X } from "lucide-react"
import { Button } from "@/components/ui/Button"
import { useToast } from "@/components/ui/Toast"
import { cn } from "@/lib/utils/cn"

export function QuickNoteButton() {
  const router = useRouter()
  const { toast } = useToast()
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
        body: JSON.stringify({
          title,
          body,
          category,
          priority,
          project: process.env.NEXT_PUBLIC_AIOS_PROJECT ?? "411",
        }),
      })
      if (!res.ok) {
        const e = await res.json().catch(() => ({}))
        setError(e.error ?? `HTTP ${res.status}`)
      } else {
        setOpen(false)
        setTitle("")
        setBody("")
        toast(`Note saved: ${title}`, { tone: "success" })
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
        type="button"
        onClick={() => setOpen(true)}
        className="fixed bottom-24 right-5 z-30 inline-flex h-11 items-center gap-2 rounded-full border border-accent/40 bg-accent px-4 text-sm font-semibold text-accent-fg shadow-card-hover transition-all hover:bg-accent-hover"
        title="Add quick note"
      >
        <Plus className="h-4 w-4" />
        <span className="hidden sm:inline">Note</span>
      </button>
    )
  }

  return (
    <div className="fixed bottom-24 right-5 z-30 w-80 max-w-[calc(100vw-2rem)] rounded-xl border border-border bg-surface p-3 shadow-card-hover">
      <div className="mb-2 flex items-center justify-between">
        <span className="text-xs font-semibold uppercase tracking-wider text-fg">Quick note</span>
        <button
          onClick={() => setOpen(false)}
          className="rounded p-1 text-fg-muted hover:bg-surface-2 hover:text-fg"
          aria-label="Close"
        >
          <X className="h-3.5 w-3.5" />
        </button>
      </div>
      {error ? <p className="mb-2 text-[11px] text-danger">{error}</p> : null}
      <input
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        placeholder="Title"
        autoFocus
        className="mb-2 w-full rounded-md border border-border bg-surface-2 px-2.5 py-1.5 text-sm text-fg outline-none focus:border-accent"
      />
      <textarea
        value={body}
        onChange={(e) => setBody(e.target.value)}
        placeholder="Body (optional)"
        rows={3}
        className="mb-2 w-full resize-none rounded-md border border-border bg-surface-2 px-2.5 py-1.5 text-sm text-fg outline-none focus:border-accent"
      />
      <div className="mb-2 flex gap-2">
        <select
          value={category}
          onChange={(e) => setCategory(e.target.value)}
          className="flex-1 rounded-md border border-border bg-surface-2 px-2 py-1.5 text-xs text-fg"
        >
          {["General", "Site", "Commercial", "Delivery", "Safety", "QA", "Programme", "Costing"].map((c) => (
            <option key={c}>{c}</option>
          ))}
        </select>
        <select
          value={priority}
          onChange={(e) => setPriority(e.target.value as "Low" | "Medium" | "High")}
          className="rounded-md border border-border bg-surface-2 px-2 py-1.5 text-xs text-fg"
        >
          {["Low", "Medium", "High"].map((p) => (
            <option key={p}>{p}</option>
          ))}
        </select>
      </div>
      <Button
        variant="primary"
        size="sm"
        disabled={!title || pending}
        onClick={submit}
        className={cn("w-full justify-center")}
      >
        {pending ? "Saving..." : "Save to Notion"}
      </Button>
    </div>
  )
}
