import { cn } from "@/lib/utils/cn"

export function Skeleton({ className }: { className?: string }) {
  return <div className={cn("animate-pulse rounded-md bg-surface-3/50", className)} />
}

/**
 * Skeleton shaped like a typical card (header + a few content rows).
 */
export function CardSkeleton({ rows = 3, className }: { rows?: number; className?: string }) {
  return (
    <div className={cn("rounded-lg border border-border bg-surface p-4", className)}>
      <div className="mb-3 flex items-center gap-2">
        <Skeleton className="h-7 w-7" />
        <Skeleton className="h-3.5 w-32" />
      </div>
      <div className="space-y-2">
        {Array.from({ length: rows }).map((_, i) => (
          <Skeleton key={i} className="h-3.5 w-full" />
        ))}
      </div>
    </div>
  )
}
