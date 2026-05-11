import type { LucideIcon } from "lucide-react"
import type { ReactNode } from "react"
import { cn } from "@/lib/utils/cn"

export function Card({
  title,
  subtitle,
  icon: Icon,
  action,
  href,
  children,
  className,
  bodyClassName,
  tone = "default",
}: {
  title?: string
  subtitle?: ReactNode
  icon?: LucideIcon
  action?: ReactNode
  href?: string
  children: ReactNode
  className?: string
  bodyClassName?: string
  tone?: "default" | "accent" | "warning" | "danger"
}) {
  const toneRing = {
    default: "",
    accent: "ring-1 ring-accent/20",
    warning: "ring-1 ring-warning/30",
    danger: "ring-1 ring-danger/30",
  }[tone]

  const Wrapper = href ? "a" : "div"
  const wrapperProps = href ? { href } : {}

  return (
    <Wrapper
      {...(wrapperProps as Record<string, unknown>)}
      className={cn(
        "block rounded-lg border border-border bg-surface shadow-card-sm transition-all",
        href && "cursor-pointer hover:border-border-strong hover:shadow-card",
        toneRing,
        className,
      )}
    >
      {title || Icon || action ? (
        <div className="flex items-center justify-between gap-3 border-b border-border px-4 py-3">
          <div className="flex min-w-0 items-center gap-2.5">
            {Icon ? (
              <div
                className={cn(
                  "flex h-7 w-7 shrink-0 items-center justify-center rounded-md",
                  tone === "default"
                    ? "bg-surface-2 text-fg-muted"
                    : tone === "accent"
                      ? "bg-accent/15 text-accent"
                      : tone === "warning"
                        ? "bg-warning/15 text-warning"
                        : "bg-danger/15 text-danger",
                )}
              >
                <Icon className="h-4 w-4" />
              </div>
            ) : null}
            <div className="min-w-0 flex-1">
              {title ? (
                <h3 className="truncate text-sm font-semibold tracking-tight text-fg">
                  {title}
                </h3>
              ) : null}
              {subtitle ? (
                <div className="truncate text-xs text-fg-muted">{subtitle}</div>
              ) : null}
            </div>
          </div>
          {action ? <div className="shrink-0">{action}</div> : null}
        </div>
      ) : null}
      <div className={cn("p-4", bodyClassName)}>{children}</div>
    </Wrapper>
  )
}
