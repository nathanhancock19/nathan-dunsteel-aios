"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import type { LucideIcon } from "lucide-react"
import { cn } from "@/lib/utils/cn"

export function SidebarItem({
  href,
  icon: Icon,
  label,
  badge,
  external,
  onClick,
}: {
  href: string
  icon: LucideIcon
  label: string
  badge?: number | string
  external?: boolean
  onClick?: () => void
}) {
  const pathname = usePathname()
  const isActive = pathname === href || (href !== "/dashboard" && pathname?.startsWith(href))

  const inner = (
    <div
      className={cn(
        "group flex items-center gap-3 rounded-md px-3 py-1.5 text-sm transition-colors",
        isActive
          ? "bg-accent/15 text-accent"
          : "text-fg-muted hover:bg-surface-2 hover:text-fg",
      )}
    >
      <Icon className={cn("h-4 w-4 shrink-0", isActive ? "text-accent" : "text-fg-subtle group-hover:text-fg-muted")} />
      <span className="flex-1 truncate">{label}</span>
      {badge ? (
        <span
          className={cn(
            "rounded-full px-1.5 py-0.5 text-[10px] font-medium leading-none",
            isActive ? "bg-accent/20 text-accent" : "bg-surface-3 text-fg-muted",
          )}
        >
          {badge}
        </span>
      ) : null}
    </div>
  )

  if (external) {
    return (
      <a href={href} target="_blank" rel="noreferrer" onClick={onClick}>
        {inner}
      </a>
    )
  }
  return (
    <Link href={href} onClick={onClick}>
      {inner}
    </Link>
  )
}
