import { cn } from "@/lib/utils/cn"

export function Stat({
  label,
  value,
  sub,
  tone = "default",
  className,
}: {
  label: string
  value: string | number
  sub?: string
  tone?: "default" | "accent" | "success" | "warning" | "danger"
  className?: string
}) {
  const toneClass = {
    default: "text-fg",
    accent: "text-accent",
    success: "text-success",
    warning: "text-warning",
    danger: "text-danger",
  }[tone]
  return (
    <div className={cn("min-w-0", className)}>
      <p className="text-[10px] font-medium uppercase tracking-wider text-fg-subtle">
        {label}
      </p>
      <p className={cn("mt-0.5 text-lg font-semibold tracking-tight tabular-nums", toneClass)}>
        {value}
      </p>
      {sub ? <p className="text-[11px] text-fg-muted">{sub}</p> : null}
    </div>
  )
}
