"use client"

import { useState } from "react"
import { Menu, X } from "lucide-react"
import { Logo } from "./Logo"
import { Sidebar } from "./Sidebar"

export function MobileTopbar({ name, role }: { name: string; role?: string }) {
  const [open, setOpen] = useState(false)
  return (
    <>
      <header className="sticky top-0 z-30 flex h-14 items-center justify-between border-b border-border bg-surface px-3 md:hidden">
        <button
          type="button"
          onClick={() => setOpen(true)}
          aria-label="Open navigation"
          className="inline-flex h-9 w-9 items-center justify-center rounded-md text-fg-muted hover:bg-surface-2 hover:text-fg"
        >
          <Menu className="h-5 w-5" />
        </button>
        <Logo size="sm" showName className="h-7" />
        <div className="w-9" aria-hidden />
      </header>

      {open ? (
        <div className="fixed inset-0 z-40 md:hidden" aria-modal="true" role="dialog">
          <div
            className="absolute inset-0 bg-bg/80 backdrop-blur-sm"
            onClick={() => setOpen(false)}
            aria-hidden
          />
          <div className="absolute inset-y-0 left-0 w-72 max-w-[85vw] bg-surface shadow-card-hover">
            <button
              type="button"
              onClick={() => setOpen(false)}
              aria-label="Close navigation"
              className="absolute right-3 top-3 z-10 inline-flex h-8 w-8 items-center justify-center rounded-md text-fg-muted hover:bg-surface-2 hover:text-fg"
            >
              <X className="h-4 w-4" />
            </button>
            <Sidebar name={name} role={role} onItemClick={() => setOpen(false)} forceMobile />
          </div>
        </div>
      ) : null}
    </>
  )
}
