"use client"

import { useState, useRef, useEffect } from "react"
import { signOut } from "next-auth/react"
import Link from "next/link"
import { LogOut, Settings, ChevronUp } from "lucide-react"
import { ThemeToggle } from "@/components/theme/ThemeToggle"
import { cn } from "@/lib/utils/cn"

export function UserWidget({
  name,
  role,
  className,
}: {
  name: string
  role?: string
  className?: string
}) {
  const initials = name
    .split(" ")
    .map((p) => p[0])
    .filter(Boolean)
    .join("")
    .slice(0, 2)
    .toUpperCase()

  const [open, setOpen] = useState(false)
  const popRef = useRef<HTMLDivElement | null>(null)

  useEffect(() => {
    if (!open) return
    function handleClickOutside(e: MouseEvent) {
      if (popRef.current && !popRef.current.contains(e.target as Node)) {
        setOpen(false)
      }
    }
    window.addEventListener("mousedown", handleClickOutside)
    return () => window.removeEventListener("mousedown", handleClickOutside)
  }, [open])

  return (
    <div className={cn("relative", className)} ref={popRef}>
      {open ? (
        <div className="absolute bottom-full left-2 right-2 mb-2 overflow-hidden rounded-lg border border-border bg-surface shadow-card-hover">
          <Link
            href="/settings"
            onClick={() => setOpen(false)}
            className="flex items-center gap-2 px-3 py-2 text-sm text-fg hover:bg-surface-2"
          >
            <Settings className="h-4 w-4 text-fg-muted" />
            <span>Settings</span>
          </Link>
          <button
            type="button"
            onClick={() => {
              setOpen(false)
              signOut({ callbackUrl: "/login" })
            }}
            className="flex w-full items-center gap-2 px-3 py-2 text-sm text-fg hover:bg-surface-2"
          >
            <LogOut className="h-4 w-4 text-fg-muted" />
            <span>Sign out</span>
          </button>
        </div>
      ) : null}

      <div className="flex items-center gap-2 border-t border-border p-3">
        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          className="flex flex-1 items-center gap-3 rounded-md p-1 text-left transition-colors hover:bg-surface-2"
        >
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-steel-700 text-sm font-semibold text-fg ring-1 ring-border">
            {initials}
          </div>
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-medium text-fg">{name}</p>
            {role ? <p className="truncate text-xs text-fg-muted">{role}</p> : null}
          </div>
          <ChevronUp className={cn("h-3.5 w-3.5 text-fg-muted transition-transform", open && "rotate-180")} />
        </button>
        <ThemeToggle />
      </div>
    </div>
  )
}
