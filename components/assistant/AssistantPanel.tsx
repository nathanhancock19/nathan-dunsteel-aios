"use client"

import { FormEvent, useEffect, useRef, useState } from "react"
import ReactMarkdown from "react-markdown"
import remarkGfm from "remark-gfm"

type Message = { role: "user" | "assistant"; content: string }

type StreamEvent =
  | { type: "text"; text: string }
  | { type: "tool_use"; name: string; input: Record<string, unknown> }
  | { type: "tool_result"; name: string; ok: boolean; summary: string }
  | { type: "done" }
  | { type: "error"; error: string }

const STORAGE_KEY = "aios.assistant.history.v1"

export function AssistantPanel() {
  const [open, setOpen] = useState(false)
  const [messages, setMessages] = useState<Message[]>([])
  const [input, setInput] = useState("")
  const [pending, setPending] = useState(false)
  const [toolNote, setToolNote] = useState<string | null>(null)
  const scrollRef = useRef<HTMLDivElement>(null)

  // Restore history from localStorage on mount
  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY)
      if (raw) setMessages(JSON.parse(raw) as Message[])
    } catch {}
  }, [])

  // Persist on change
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(messages))
    } catch {}
  }, [messages])

  // Auto-scroll to bottom on new content
  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" })
  }, [messages, pending])

  // Cmd+K / Ctrl+K opens the panel and focuses the input.
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      const cmdK = (e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k"
      if (cmdK) {
        e.preventDefault()
        setOpen((current) => {
          if (!current) {
            // focus on next tick once panel renders
            setTimeout(() => {
              const input = document.querySelector<HTMLInputElement>(
                'input[data-assistant-input="true"]',
              )
              input?.focus()
            }, 0)
            return true
          }
          // already open: just focus input
          const input = document.querySelector<HTMLInputElement>(
            'input[data-assistant-input="true"]',
          )
          input?.focus()
          return current
        })
      }
      if (e.key === "Escape" && open) {
        setOpen(false)
      }
    }
    window.addEventListener("keydown", onKey)
    return () => window.removeEventListener("keydown", onKey)
  }, [open])

  async function onSubmit(e: FormEvent) {
    e.preventDefault()
    const text = input.trim()
    if (!text || pending) return

    const userMessage: Message = { role: "user", content: text }
    const assistantPlaceholder: Message = { role: "assistant", content: "" }
    setMessages((prev) => [...prev, userMessage, assistantPlaceholder])
    setInput("")
    setPending(true)
    setToolNote(null)

    try {
      const res = await fetch("/api/assistant/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: [...messages, userMessage] }),
      })
      if (!res.ok || !res.body) {
        throw new Error(`HTTP ${res.status}`)
      }

      const reader = res.body.getReader()
      const decoder = new TextDecoder()
      let buffer = ""

      while (true) {
        const { done, value } = await reader.read()
        if (done) break
        buffer += decoder.decode(value, { stream: true })
        const lines = buffer.split("\n\n")
        buffer = lines.pop() ?? ""
        for (const line of lines) {
          if (!line.startsWith("data: ")) continue
          let event: StreamEvent
          try {
            event = JSON.parse(line.slice(6)) as StreamEvent
          } catch {
            continue
          }
          if (event.type === "text") {
            setMessages((prev) => {
              const next = [...prev]
              const last = next[next.length - 1]
              if (last && last.role === "assistant") {
                next[next.length - 1] = { ...last, content: last.content + event.text }
              }
              return next
            })
          } else if (event.type === "tool_use") {
            setToolNote(`Calling ${event.name}...`)
          } else if (event.type === "tool_result") {
            setToolNote(`${event.name}: ${event.summary}`)
          } else if (event.type === "error") {
            setMessages((prev) => {
              const next = [...prev]
              const last = next[next.length - 1]
              if (last && last.role === "assistant") {
                next[next.length - 1] = { ...last, content: `_Error: ${event.error}_` }
              }
              return next
            })
          }
        }
      }
    } catch (err) {
      setMessages((prev) => {
        const next = [...prev]
        const last = next[next.length - 1]
        if (last && last.role === "assistant" && last.content === "") {
          next[next.length - 1] = {
            ...last,
            content: `_Error: ${err instanceof Error ? err.message : String(err)}_`,
          }
        }
        return next
      })
    } finally {
      setPending(false)
      setToolNote(null)
    }
  }

  function clearHistory() {
    setMessages([])
    localStorage.removeItem(STORAGE_KEY)
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-label={open ? "Close AI assistant" : "Open AI assistant (Cmd+K)"}
        className="fixed bottom-4 right-4 z-50 flex h-12 w-12 items-center justify-center rounded-full bg-fg text-ink shadow-lg transition hover:bg-fg-300"
      >
        {open ? "X" : "AI"}
      </button>

      {open ? (
        <div className="fixed bottom-20 right-4 z-50 flex h-[600px] max-h-[80vh] w-[380px] max-w-[calc(100vw-2rem)] flex-col rounded-lg border border-rule bg-ink shadow-2xl">
          <div className="flex items-center justify-between border-b border-rule px-4 py-3">
            <div>
              <h3 className="text-sm font-semibold tracking-tight text-cream">AIOS Assistant</h3>
              <p className="text-xs text-muted">
                Cmd+K to open. Ask anything; confirms before any write.
              </p>
            </div>
            <button
              type="button"
              onClick={clearHistory}
              className="text-xs text-muted hover:text-cream"
            >
              Clear
            </button>
          </div>

          <div ref={scrollRef} className="flex-1 space-y-3 overflow-y-auto px-4 py-3">
            {messages.length === 0 ? (
              <div className="text-sm text-muted">
                <p className="mb-2">Try:</p>
                <ul className="space-y-1 text-cream/70">
                  <li>- What&apos;s on the inbox right now?</li>
                  <li>- Approve the Moss Vale Auto PO with the usual allocation</li>
                  <li>- What did I approve for cold rolled materials last week?</li>
                  <li>- Note that I told Mike concrete pour will be 11am Thursday</li>
                </ul>
              </div>
            ) : null}

            {messages.map((m, i) => (
              <div
                key={i}
                className={`rounded-md px-3 py-2 text-sm ${
                  m.role === "user"
                    ? "ml-6 bg-rule text-cream"
                    : "mr-6 bg-ink/80 text-cream/90"
                }`}
              >
                {m.role === "assistant" ? (
                  m.content ? (
                    <div className="prose prose-sm prose-invert max-w-none prose-p:my-1 prose-ul:my-1 prose-ol:my-1 prose-li:my-0 prose-headings:my-2 prose-table:my-2 prose-code:rounded prose-code:bg-rule prose-code:px-1 prose-code:text-xs">
                      <ReactMarkdown remarkPlugins={[remarkGfm]}>{m.content}</ReactMarkdown>
                    </div>
                  ) : pending && i === messages.length - 1 ? (
                    <span className="text-muted">...</span>
                  ) : null
                ) : (
                  m.content
                )}
              </div>
            ))}

            {toolNote ? (
              <p className="text-xs italic text-fg">{toolNote}</p>
            ) : null}
          </div>

          <form onSubmit={onSubmit} className="border-t border-rule p-3">
            <div className="flex gap-2">
              <input
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder={pending ? "Thinking..." : "Ask anything..."}
                disabled={pending}
                data-assistant-input="true"
                className="flex-1 rounded-md border border-rule bg-ink px-3 py-2 text-sm text-cream outline-none focus:border-border-strong disabled:opacity-50"
              />
              <button
                type="submit"
                disabled={pending || !input.trim()}
                className="rounded-md bg-fg px-3 py-2 text-sm font-semibold text-ink transition hover:bg-fg-300 disabled:cursor-not-allowed disabled:opacity-50"
              >
                Send
              </button>
            </div>
          </form>
        </div>
      ) : null}
    </>
  )
}
