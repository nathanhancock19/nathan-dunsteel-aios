import { getHighPriorityNotes } from "@/lib/notion/general-notes"
import { Card, EmptyState, ErrorState, ConfigState } from "./Card"

export async function NotesCard() {
  if (!process.env.NOTION_GENERAL_NOTES_DB) {
    return (
      <Card title="High priority notes">
        <ConfigState envVar="NOTION_GENERAL_NOTES_DB" />
      </Card>
    )
  }
  try {
    const project = process.env.AIOS_PRIMARY_PROJECT_NUMBER
    const notes = await getHighPriorityNotes(project)
    if (notes.length === 0) {
      return (
        <Card title="High priority notes" subtitle="411">
          <EmptyState>Nothing high priority.</EmptyState>
        </Card>
      )
    }
    return (
      <Card title="High priority notes" subtitle="411">
        <ul className="space-y-2 text-sm">
          {notes.slice(0, 5).map((n) => (
            <li key={n.id}>
              <a
                href={n.url}
                target="_blank"
                rel="noreferrer"
                className="block rounded border border-rule/50 bg-ink/40 p-2 hover:border-signal"
              >
                <div className="flex items-center justify-between">
                  <span className="text-cream">{n.title}</span>
                  {n.category ? <span className="text-[10px] uppercase tracking-wider text-muted">{n.category}</span> : null}
                </div>
                {n.body ? <p className="mt-0.5 line-clamp-2 text-xs text-muted">{n.body}</p> : null}
              </a>
            </li>
          ))}
          {notes.length > 5 ? <li className="text-xs text-muted">+{notes.length - 5} more</li> : null}
        </ul>
      </Card>
    )
  } catch (err) {
    return (
      <Card title="High priority notes">
        <ErrorState message={err instanceof Error ? err.message : String(err)} />
      </Card>
    )
  }
}
