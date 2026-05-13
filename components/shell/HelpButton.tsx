"use client"

import { useState, useRef, useEffect } from "react"
import { HelpCircle, X, Keyboard, MessageCircle, BookOpen, Send } from "lucide-react"
import { useToast } from "@/components/ui/Toast"
import { Button } from "@/components/ui/Button"
import { cn } from "@/lib/utils/cn"

export function HelpButton() {
  const [open, setOpen] = useState(false)
  const [feedback, setFeedback] = useState("")
  const [sending, setSending] = useState(false)
  const { toast } = useToast()
  const ref = useRef<HTMLDivElement | null>(null)

  useEffect(() => {
    if (!open) return
    function onClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    window.addEventListener("mousedown", onClick)
    return () => window.removeEventListener("mousedown", onClick)
  }, [open])

  async function sendFeedback() {
    if (!feedback.trim()) return
    setSending(true)
    try {
      const res = await fetch("/api/notes/create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: `AIOS feedback (${new Date().toLocaleDateString("en-CA", { timeZone: "Australia/Sydney" })})`,
          body: feedback,
          category: "General",
          priority: "Low",
        }),
      })
      if (res.ok) {
        toast("Feedback sent. Thanks.", { tone: "success" })
        setFeedback("")
        setOpen(false)
      } else {
        toast("Could not send feedback", { tone: "danger" })
      }
    } catch {
      toast("Could not send feedback", { tone: "danger" })
    } finally {
      setSending(false)
    }
  }

  return (
    <div ref={ref} className="fixed bottom-5 right-5 z-30 hidden sm:block">
      {open ? (
        <div className="mb-2 w-80 rounded-xl border border-border bg-surface p-3 shadow-card-hover">
          <div className="mb-3 flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-fg">Help</span>
            <button
              type="button"
              onClick={() => setOpen(false)}
              className="rounded p-1 text-fg-muted hover:bg-surface-2 hover:text-fg"
              aria-label="Close"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          </div>

          <Section icon={Keyboard} title="Shortcuts">
            <Shortcut keys={["Cmd", "K"]} label="Open AI assistant" />
            <Shortcut keys={["Cmd", "/"]} label="Focus quick note" />
          </Section>

          <Section icon={BookOpen} title="About AIOS">
            <p className="text-xs text-fg-muted">
              Dunsteel AI Operating System: single-pane PM dashboard with live integrations and AI assistant.
            </p>
          </Section>

          <Section icon={MessageCircle} title="Send feedback">
            <textarea
              value={feedback}
              onChange={(e) => setFeedback(e.target.value)}
              placeholder="What's working, what's not"
              rows={3}
              className="w-full resize-none rounded-md border border-border bg-surface-2 px-2.5 py-1.5 text-sm text-fg outline-none focus:border-accent"
            />
            <Button
              variant="primary"
              size="sm"
              icon={Send}
              disabled={!feedback.trim() || sending}
              onClick={sendFeedback}
              className="mt-2 w-full justify-center"
            >
              {sending ? "Sending..." : "Send"}
            </Button>
          </Section>
        </div>
      ) : null}
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        title="Help"
        aria-label="Help"
        className={cn(
          "inline-flex h-11 w-11 items-center justify-center rounded-full border border-border bg-surface text-fg shadow-card transition-colors hover:border-border-strong",
          open && "bg-surface-2",
        )}
      >
        <HelpCircle className="h-5 w-5 text-fg-muted" />
      </button>
    </div>
  )
}

function Section({
  icon: Icon,
  title,
  children,
}: {
  icon: typeof Keyboard
  title: string
  children: React.ReactNode
}) {
  return (
    <div className="mb-3 last:mb-0">
      <div className="mb-1 flex items-center gap-1.5">
        <Icon className="h-3.5 w-3.5 text-fg-subtle" />
        <span className="text-[10px] font-semibold uppercase tracking-wider text-fg-subtle">{title}</span>
      </div>
      {children}
    </div>
  )
}

function Shortcut({ keys, label }: { keys: string[]; label: string }) {
  return (
    <div className="mb-1 flex items-center justify-between text-xs">
      <span className="text-fg">{label}</span>
      <span className="flex gap-1">
        {keys.map((k) => (
          <kbd
            key={k}
            className="rounded border border-border bg-surface-2 px-1.5 py-0.5 font-mono text-[10px] text-fg-muted"
          >
            {k}
          </kbd>
        ))}
      </span>
    </div>
  )
}
