"use client"

import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from "react"
import { Check, AlertCircle, X, Info } from "lucide-react"
import { cn } from "@/lib/utils/cn"

type ToastTone = "info" | "success" | "warning" | "danger"

type Toast = {
  id: string
  message: string
  tone: ToastTone
}

type ToastContextValue = {
  toast: (message: string, opts?: { tone?: ToastTone; duration?: number }) => void
}

const ToastContext = createContext<ToastContextValue | null>(null)

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([])

  const dismiss = useCallback((id: string) => {
    setToasts((current) => current.filter((t) => t.id !== id))
  }, [])

  const toast = useCallback<ToastContextValue["toast"]>(
    (message, opts) => {
      const id = `${Date.now()}-${Math.random().toString(36).slice(2, 6)}`
      const tone = opts?.tone ?? "info"
      const duration = opts?.duration ?? 3500
      setToasts((current) => [...current, { id, message, tone }])
      window.setTimeout(() => dismiss(id), duration)
    },
    [dismiss],
  )

  return (
    <ToastContext.Provider value={{ toast }}>
      {children}
      <div className="pointer-events-none fixed right-4 top-4 z-50 flex flex-col gap-2">
        {toasts.map((t) => (
          <ToastItem key={t.id} toast={t} onDismiss={() => dismiss(t.id)} />
        ))}
      </div>
    </ToastContext.Provider>
  )
}

export function useToast(): ToastContextValue {
  const ctx = useContext(ToastContext)
  if (!ctx) {
    // Allow calling useToast in pages that aren't wrapped (no-op fallback)
    return { toast: (msg) => console.warn("[toast no provider]", msg) }
  }
  return ctx
}

function ToastItem({ toast, onDismiss }: { toast: Toast; onDismiss: () => void }) {
  const [mounted, setMounted] = useState(false)
  useEffect(() => {
    const t = window.setTimeout(() => setMounted(true), 10)
    return () => window.clearTimeout(t)
  }, [])

  const Icon = toast.tone === "success" ? Check : toast.tone === "warning" ? AlertCircle : toast.tone === "danger" ? AlertCircle : Info
  const toneClass = {
    info: "border-border bg-surface",
    success: "border-success/40 bg-success/10",
    warning: "border-warning/40 bg-warning/10",
    danger: "border-danger/40 bg-danger/10",
  }[toast.tone]
  const iconClass = {
    info: "text-fg-muted",
    success: "text-success",
    warning: "text-warning",
    danger: "text-danger",
  }[toast.tone]

  return (
    <div
      className={cn(
        "pointer-events-auto flex w-full max-w-sm items-start gap-2 rounded-lg border px-3 py-2 shadow-card-hover transition-all duration-200",
        toneClass,
        mounted ? "translate-x-0 opacity-100" : "translate-x-2 opacity-0",
      )}
      role="status"
    >
      <Icon className={cn("mt-0.5 h-4 w-4 shrink-0", iconClass)} />
      <p className="flex-1 text-sm text-fg">{toast.message}</p>
      <button
        type="button"
        onClick={onDismiss}
        className="rounded p-0.5 text-fg-subtle hover:bg-surface-2 hover:text-fg"
        aria-label="Dismiss"
      >
        <X className="h-3.5 w-3.5" />
      </button>
    </div>
  )
}
