import type { ButtonHTMLAttributes, ReactNode } from "react"
import type { LucideIcon } from "lucide-react"
import { cn } from "@/lib/utils/cn"

type Variant = "primary" | "secondary" | "ghost" | "danger"
type Size = "sm" | "md"

export function Button({
  children,
  variant = "secondary",
  size = "md",
  icon: Icon,
  className,
  ...rest
}: ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: Variant
  size?: Size
  icon?: LucideIcon
  children?: ReactNode
}) {
  const v = {
    primary: "bg-accent text-accent-fg hover:bg-accent-hover disabled:bg-accent/50",
    secondary:
      "border border-border bg-surface text-fg hover:border-border-strong hover:bg-surface-2 disabled:opacity-60",
    ghost: "text-fg-muted hover:bg-surface-2 hover:text-fg disabled:opacity-60",
    danger: "bg-danger text-danger-fg hover:opacity-90 disabled:opacity-60",
  }[variant]
  const s = size === "sm" ? "h-8 px-3 text-xs" : "h-9 px-3.5 text-sm"
  return (
    <button
      className={cn(
        "inline-flex items-center gap-2 rounded-md font-medium tracking-tight transition-colors disabled:cursor-not-allowed",
        v,
        s,
        className,
      )}
      {...rest}
    >
      {Icon ? <Icon className="h-4 w-4" /> : null}
      {children}
    </button>
  )
}
