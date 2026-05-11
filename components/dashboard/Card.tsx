/**
 * Legacy dashboard Card export.
 *
 * Re-exports the new ui/Card + supporting state components so all existing
 * widgets (DiaryTodayCard, DefectsCard, NotesCard, etc.) keep working
 * without per-widget edits during the polish migration.
 */
import type { ReactNode } from "react"
import { Card as UICard } from "@/components/ui/Card"

export function Card({
  title,
  subtitle,
  children,
}: {
  title: string
  subtitle?: string
  children: ReactNode
}) {
  return (
    <UICard title={title} subtitle={subtitle}>
      {children}
    </UICard>
  )
}

export function EmptyState({ children }: { children: ReactNode }) {
  return <p className="text-sm text-fg-muted">{children}</p>
}

export function ErrorState({ message }: { message: string }) {
  return (
    <p className="text-sm text-danger">
      <span className="font-semibold">Error:</span> {message}
    </p>
  )
}

export function ConfigState({ envVar }: { envVar: string }) {
  return (
    <p className="text-sm text-fg-muted">
      Set <code className="rounded bg-surface-3 px-1 py-0.5 text-xs">{envVar}</code> in env to enable this widget.
    </p>
  )
}
