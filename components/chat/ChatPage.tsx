"use client"

import { FormEvent, useEffect, useRef, useState } from "react"
import ReactMarkdown from "react-markdown"
import remarkGfm from "remark-gfm"
import { MessageSquare, Plus, Trash2, Send, Bot } from "lucide-react"
import { cn } from "@/lib/utils/cn"

type Message = { role: "user" | "assistant"; content: string }

type Session = {
  id: string
  name: string
  messages: Message[]
  createdAt: number
  updatedAt: number
}

type StreamEvent =
  | { type: "text"; text: string }
  | { type: "tool_use"; name: string; input: Record<string, unknown> }
  | { type: "tool_result"; name: string; ok: boolean; summary: string }
  | { type: "done" }
  | { type: "error"; error: string }

const STORAGE_KEY = "aios.chat.sessions.v1"

function newSession(): Session {
  return {
    id: crypto.randomUUID(),
    name: "New chat",
    messages: [],
    createdAt: Date.now(),
    updatedAt: Date.now(),
  }
}

function autoName(firstMessage: string): string {
  const trimmed = firstMessage.trim()
  return trimmed.length <= 42 ? trimmed : trimmed.slice(0, 39) + "..."
}

function formatDate(ts: number): string {
  const d = new Date(ts)
  const now = new Date()
  if (d.toDateString() === now.toDateString()) {
    return d.toLocaleTimeString("en-AU", { hour: "2-digit", minute: "2-digit" })
  }
  return d.toLocaleDateString("en-AU", { day: "numeric", month: "short" })
}

const STARTER_PROMPTS = [
  "What's on the inbox right now?",
  "What POs are waiting on my approval?",
  "What was logged on site yesterday?",
  "Summarise what happened on 411 this week.",
]

export function ChatPage() {
  const [sessions, setSessions] = useState<Session[]>([])
  const [activeId, setActiveId] = useState<string | null>(null)
  const [input, setInput] = useState("")
  const [pending, setPending] = useState(false)
  const [toolNote, setToolNote] = useState<string | null>(null)
  const scrollRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLTextAreaElement>(null)

  // Load sessions from localStorage
  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY)
      if (raw) {
        const loaded = JSON.parse(raw) as Session[]
        setSessions(loaded)
        if (loaded.length > 0) setActiveId(loaded[0].id)
      } else {
        const initial = newSession()
        setSessions([initial])
        setActiveId(initial.id)
      }
    } catch {
      const initial = newSession()
      setSessions([initial])
      setActiveId(initial.id)
    }
  }, [])

  // Persist sessions
  useEffect(() => {
    if (sessions.length === 0) return
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(sessions))
    } catch {}
  }, [sessions])

  // Scroll to bottom on new messages
  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" })
  }, [sessions, activeId, pending])

  const activeSession = sessions.find((s) => s.id === activeId) ?? null

  function createSession() {
    const s = newSession()
    setSessions((prev) => [s, ...prev])
    setActiveId(s.id)
    setInput("")
    inputRef.current?.focus()
  }

  function deleteSession(id: string) {
    setSessions((prev) => {
      const next = prev.filter((s) => s.id !== id)
      if (activeId === id) {
        setActiveId(next[0]?.id ?? null)
        if (next.length === 0) {
          const fresh = newSession()
          setSessions([fresh])
          setActiveId(fresh.id)
          return [fresh]
        }
      }
      return next
    })
  }

  function updateSession(id: string, patch: Partial<Session>) {
    setSessions((prev) =>
      prev.map((s) => (s.id === id ? { ...s, ...patch, updatedAt: Date.now() } : s)),
    )
  }

  async function onSubmit(e?: FormEvent, overrideText?: string) {
    e?.preventDefault()
    const text = (overrideText ?? input).trim()
    if (!text || pending || !activeId) return

    const isFirstMessage = (activeSession?.messages.length ?? 0) === 0

    const userMsg: Message = { role: "user", content: text }
    const placeholder: Message = { role: "assistant", content: "" }

    updateSession(activeId, {
      messages: [...(activeSession?.messages ?? []), userMsg, placeholder],
      ...(isFirstMessage ? { name: autoName(text) } : {}),
    })

    setInput("")
    setPending(true)
    setToolNote(null)

    const history = [...(activeSession?.messages ?? []), userMsg]

    try {
      const res = await fetch("/api/assistant/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: history }),
      })
      if (!res.ok || !res.body) throw new Error(`HTTP ${res.status}`)

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
            setSessions((prev) =>
              prev.map((s) => {
                if (s.id !== activeId) return s
                const msgs = [...s.messages]
                const last = msgs[msgs.length - 1]
                if (last?.role === "assistant") {
                  msgs[msgs.length - 1] = { ...last, content: last.content + event.text }
                }
                return { ...s, messages: msgs, updatedAt: Date.now() }
              }),
            )
          } else if (event.type === "tool_use") {
            setToolNote(`Calling ${event.name}...`)
          } else if (event.type === "tool_result") {
            setToolNote(null)
          } else if (event.type === "error") {
            setSessions((prev) =>
              prev.map((s) => {
                if (s.id !== activeId) return s
                const msgs = [...s.messages]
                const last = msgs[msgs.length - 1]
                if (last?.role === "assistant" && last.content === "") {
                  msgs[msgs.length - 1] = { ...last, content: `_Error: ${event.error}_` }
                }
                return { ...s, messages: msgs }
              }),
            )
          }
        }
      }
    } catch (err) {
      setSessions((prev) =>
        prev.map((s) => {
          if (s.id !== activeId) return s
          const msgs = [...s.messages]
          const last = msgs[msgs.length - 1]
          if (last?.role === "assistant" && last.content === "") {
            msgs[msgs.length - 1] = {
              ...last,
              content: `_Error: ${err instanceof Error ? err.message : String(err)}_`,
            }
          }
          return { ...s, messages: msgs }
        }),
      )
    } finally {
      setPending(false)
      setToolNote(null)
      inputRef.current?.focus()
    }
  }

  function onKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault()
      onSubmit()
    }
  }

  const messages = activeSession?.messages ?? []

  return (
    <div className="flex h-full w-full overflow-hidden">
      {/* Sessions sidebar */}
      <aside className="flex w-64 shrink-0 flex-col border-r border-border bg-surface">
        <div className="flex h-14 shrink-0 items-center justify-between border-b border-border px-4">
          <div className="flex items-center gap-2">
            <MessageSquare className="h-4 w-4 text-fg-muted" />
            <span className="text-sm font-semibold text-fg">AI Chat</span>
          </div>
          <button
            type="button"
            onClick={createSession}
            title="New chat"
            className="flex h-7 w-7 items-center justify-center rounded-md text-fg-muted transition-colors hover:bg-surface-2 hover:text-fg"
          >
            <Plus className="h-4 w-4" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto py-2">
          {sessions.length === 0 ? (
            <p className="px-4 py-3 text-xs text-fg-subtle">No chats yet.</p>
          ) : (
            sessions.map((s) => (
              <SessionItem
                key={s.id}
                session={s}
                active={s.id === activeId}
                onSelect={() => setActiveId(s.id)}
                onDelete={() => deleteSession(s.id)}
              />
            ))
          )}
        </div>
      </aside>

      {/* Chat area */}
      <div className="flex flex-1 flex-col overflow-hidden bg-bg">
        {/* Messages */}
        <div ref={scrollRef} className="flex-1 overflow-y-auto px-6 py-6">
          {messages.length === 0 ? (
            <div className="flex h-full flex-col items-center justify-center gap-6">
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-surface-2">
                <Bot className="h-6 w-6 text-fg-muted" />
              </div>
              <div className="text-center">
                <p className="text-sm font-medium text-fg">AIOS Assistant</p>
                <p className="mt-1 text-xs text-fg-subtle">Ask anything about the project.</p>
              </div>
              <div className="grid w-full max-w-lg grid-cols-2 gap-2">
                {STARTER_PROMPTS.map((p) => (
                  <button
                    key={p}
                    type="button"
                    onClick={() => onSubmit(undefined, p)}
                    disabled={pending}
                    className="rounded-lg border border-border bg-surface px-3 py-2 text-left text-xs text-fg-muted transition-colors hover:bg-surface-2 hover:text-fg disabled:opacity-50"
                  >
                    {p}
                  </button>
                ))}
              </div>
            </div>
          ) : (
            <div className="mx-auto flex max-w-3xl flex-col gap-4">
              {messages.map((m, i) => (
                <div
                  key={i}
                  className={cn("flex", m.role === "user" ? "justify-end" : "justify-start")}
                >
                  <div
                    className={cn(
                      "max-w-[80%] rounded-2xl px-4 py-2.5 text-sm",
                      m.role === "user"
                        ? "bg-surface-2 text-fg"
                        : "bg-surface text-fg",
                    )}
                  >
                    {m.role === "assistant" ? (
                      m.content ? (
                        <div
                          className="prose prose-sm max-w-none [&_p]:my-1 [&_ul]:my-1 [&_ol]:my-1 [&_li]:my-0 [&_h1]:my-2 [&_h2]:my-2 [&_h3]:my-2 [&_table]:my-2 [&_code]:rounded [&_code]:bg-surface-2 [&_code]:px-1 [&_code]:text-xs"
                          style={{
                            "--tw-prose-body": "var(--fg)",
                            "--tw-prose-headings": "var(--fg)",
                            "--tw-prose-lead": "var(--fg-muted)",
                            "--tw-prose-links": "var(--fg)",
                            "--tw-prose-bold": "var(--fg)",
                            "--tw-prose-counters": "var(--fg-muted)",
                            "--tw-prose-bullets": "var(--fg-muted)",
                            "--tw-prose-hr": "var(--border)",
                            "--tw-prose-quotes": "var(--fg)",
                            "--tw-prose-quote-borders": "var(--border)",
                            "--tw-prose-captions": "var(--fg-subtle)",
                            "--tw-prose-code": "var(--fg)",
                            "--tw-prose-pre-code": "var(--fg)",
                            "--tw-prose-pre-bg": "var(--surface-2)",
                            "--tw-prose-th-borders": "var(--border)",
                            "--tw-prose-td-borders": "var(--border)",
                          } as React.CSSProperties}
                        >
                          <ReactMarkdown remarkPlugins={[remarkGfm]}>{m.content}</ReactMarkdown>
                        </div>
                      ) : pending && i === messages.length - 1 ? (
                        <span className="inline-flex gap-1">
                          <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-fg-subtle" style={{ animationDelay: "0ms" }} />
                          <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-fg-subtle" style={{ animationDelay: "150ms" }} />
                          <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-fg-subtle" style={{ animationDelay: "300ms" }} />
                        </span>
                      ) : null
                    ) : (
                      m.content
                    )}
                  </div>
                </div>
              ))}

              {toolNote ? (
                <p className="text-center text-xs italic text-fg-subtle">{toolNote}</p>
              ) : null}
            </div>
          )}
        </div>

        {/* Input */}
        <div className="shrink-0 border-t border-border bg-surface px-4 py-3">
          <form onSubmit={onSubmit} className="mx-auto flex max-w-3xl gap-2">
            <textarea
              ref={inputRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={onKeyDown}
              placeholder={pending ? "Thinking..." : "Ask anything — Enter to send, Shift+Enter for new line"}
              disabled={pending}
              rows={1}
              className="flex-1 resize-none rounded-xl border border-border bg-bg px-4 py-2.5 text-sm text-fg placeholder:text-fg-subtle outline-none focus:border-fg-muted disabled:opacity-50"
              style={{ minHeight: "42px", maxHeight: "200px" }}
              onInput={(e) => {
                const el = e.currentTarget
                el.style.height = "auto"
                el.style.height = Math.min(el.scrollHeight, 200) + "px"
              }}
            />
            <button
              type="submit"
              disabled={pending || !input.trim()}
              className="flex h-[42px] w-[42px] shrink-0 items-center justify-center rounded-xl bg-surface-2 text-fg-muted transition-colors hover:bg-surface-3 hover:text-fg disabled:cursor-not-allowed disabled:opacity-40"
            >
              <Send className="h-4 w-4" />
            </button>
          </form>
          <p className="mt-1.5 text-center text-[10px] text-fg-subtle">
            Connected to your Dunsteel project data
          </p>
        </div>
      </div>
    </div>
  )
}

function SessionItem({
  session,
  active,
  onSelect,
  onDelete,
}: {
  session: Session
  active: boolean
  onSelect: () => void
  onDelete: () => void
}) {
  return (
    <div
      className={cn(
        "group relative flex cursor-pointer items-start gap-2 px-3 py-2 text-sm transition-colors",
        active ? "bg-surface-2 text-fg" : "text-fg-muted hover:bg-surface-2 hover:text-fg",
      )}
      onClick={onSelect}
    >
      {active ? (
        <span className="absolute inset-y-1 left-0 w-0.5 rounded-r bg-fg" aria-hidden />
      ) : null}
      <MessageSquare className="mt-0.5 h-3.5 w-3.5 shrink-0 text-fg-subtle" />
      <div className="min-w-0 flex-1">
        <p className="truncate text-xs font-medium leading-snug">{session.name}</p>
        <p className="text-[10px] text-fg-subtle">{formatDate(session.updatedAt)}</p>
      </div>
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation()
          onDelete()
        }}
        title="Delete chat"
        className="mt-0.5 hidden h-5 w-5 shrink-0 items-center justify-center rounded text-fg-subtle transition-colors hover:text-fg group-hover:flex"
      >
        <Trash2 className="h-3 w-3" />
      </button>
    </div>
  )
}
