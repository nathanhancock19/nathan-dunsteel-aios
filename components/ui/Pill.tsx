import type { ReactNode } from "react"
import { cn } from "@/lib/utils/cn"

export function Pill({
  children,
  tone = "default",
  size = "sm",
  className,
}: {
  children: ReactNode
  tone?: "default" | "accent" | "success" | "warning" | "danger" | "muted"
  size?: "xs" | "sm"
  className?: string
}) {
  const toneClass = {
    default: "bg-surface-2 text-fg",
    muted: "bg-surface-2 text-fg-muted",
    accent: "bg-accent/15 text-accent",
    success: "bg-success/15 text-success",
    warning: "bg-warning/15 text-warning",
    danger: "bg-danger/15 text-danger",
  }[tone]
  const sizeClass = size === "xs" ? "px-1.5 py-0.5 text-[10px]" : "px-2 py-0.5 text-[11px]"
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-full font-medium uppercase tracking-wider",
        toneClass,
        sizeClass,
        className,
      )}
    >
      {children}
    </span>
  )
}
