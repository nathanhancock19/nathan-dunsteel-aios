import { getUninvoicedSubconEntries } from "@/lib/notion/diary"
import { Card, EmptyState, ErrorState, ConfigState } from "./Card"

export async function UninvoicedCard() {
  if (!process.env.NOTION_SUBCON_DIARY_DB) {
    return (
      <Card title="Uninvoiced subcon">
        <ConfigState envVar="NOTION_SUBCON_DIARY_DB" />
      </Card>
    )
  }
  try {
    const entries = await getUninvoicedSubconEntries(100)
    if (entries.length === 0) {
      return (
        <Card title="Uninvoiced subcon" subtitle="411">
          <EmptyState>All subcon entries invoiced.</EmptyState>
        </Card>
      )
    }
    const recent = entries.slice(0, 5)
    return (
      <Card title="Uninvoiced subcon" subtitle="411">
        <p className="text-2xl font-semibold tracking-tight text-fg">{entries.length}</p>
        <p className="mt-0.5 text-[11px] uppercase tracking-wider text-muted">entries pending</p>
        {recent.length > 0 ? (
          <ul className="mt-3 space-y-1 text-xs text-muted">
            {recent.map((e) => (
              <li key={e.id} className="truncate">
                {e.date ?? "?"} - {e.title}
              </li>
            ))}
            {entries.length > recent.length ? <li className="text-muted/70">+{entries.length - recent.length} more</li> : null}
          </ul>
        ) : null}
      </Card>
    )
  } catch (err) {
    return (
      <Card title="Uninvoiced subcon">
        <ErrorState message={err instanceof Error ? err.message : String(err)} />
      </Card>
    )
  }
}
