import type { ReactNode } from "react"

export function SidebarSection({
  title,
  children,
}: {
  title?: string
  children: ReactNode
}) {
  return (
    <div className="mb-1">
      {title ? (
        <p className="px-3 pb-1 pt-3 text-[10px] font-semibold uppercase tracking-wider text-fg-subtle">
          {title}
        </p>
      ) : null}
      <div className="space-y-0.5 px-2">{children}</div>
    </div>
  )
}
