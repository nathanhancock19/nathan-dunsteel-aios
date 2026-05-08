import { ReactNode } from "react"

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
    <div className="rounded-xl border border-rule bg-ink/60 p-4">
      <div className="mb-3 flex items-baseline justify-between">
        <h2 className="text-sm font-semibold tracking-tight text-cream">{title}</h2>
        {subtitle ? <span className="label">{subtitle}</span> : null}
      </div>
      {children}
    </div>
  )
}

export function EmptyState({ children }: { children: ReactNode }) {
  return <p className="text-sm text-muted">{children}</p>
}

export function ErrorState({ message }: { message: string }) {
  return (
    <p className="text-sm text-red-300">
      <span className="font-semibold">Error:</span> {message}
    </p>
  )
}

export function ConfigState({ envVar }: { envVar: string }) {
  return (
    <p className="text-sm text-muted">
      Set <code className="rounded bg-rule px-1 py-0.5 text-xs">{envVar}</code> in
      .env.local to enable this widget.
    </p>
  )
}
