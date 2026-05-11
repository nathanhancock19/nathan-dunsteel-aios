import { getHighPriorityNotes } from "@/lib/notion/general-notes"
import { Card } from "@/components/ui/Card"
import { EmptyState } from "@/components/ui/EmptyState"
import { Bookmark, Inbox as InboxIcon } from "lucide-react"

export async function NotesCard() {
  if (!process.env.NOTION_GENERAL_NOTES_DB) {
    return (
      <Card title="High priority notes" icon={Bookmark}>
        <p className="text-sm text-fg-muted">
          Set <code className="rounded bg-surface-3 px-1 py-0.5 text-xs">NOTION_GENERAL_NOTES_DB</code> to enable.
        </p>
      </Card>
    )
  }
  try {
    const project = process.env.AIOS_PRIMARY_PROJECT_NUMBER
    const notes = await getHighPriorityNotes(project)
    if (notes.length === 0) {
      return (
        <Card title="High priority notes" subtitle={project ?? undefined} icon={Bookmark}>
          <EmptyState icon={InboxIcon} title="Nothing high priority" description="All clear for now." />
        </Card>
      )
    }
    return (
      <Card title="High priority notes" subtitle={project ?? undefined} icon={Bookmark}>
        <ul className="space-y-2 text-sm">
          {notes.slice(0, 5).map((n) => (
            <li key={n.id}>
              <a
                href={n.url}
                target="_blank"
                rel="noreferrer"
                className="block rounded-md border border-border bg-surface-2 p-2 transition-colors hover:border-border-strong"
              >
                <div className="flex items-center justify-between gap-2">
                  <span className="truncate font-medium text-fg">{n.title}</span>
                  {n.category ? (
                    <span className="shrink-0 text-[10px] uppercase tracking-wider text-fg-subtle">{n.category}</span>
                  ) : null}
                </div>
                {n.body ? <p className="mt-0.5 line-clamp-2 text-xs text-fg-muted">{n.body}</p> : null}
              </a>
            </li>
          ))}
          {notes.length > 5 ? (
            <li className="text-xs text-fg-subtle">+{notes.length - 5} more</li>
          ) : null}
        </ul>
      </Card>
    )
  } catch (err) {
    return (
      <Card title="High priority notes" icon={Bookmark}>
        <p className="text-xs text-danger">{err instanceof Error ? err.message : String(err)}</p>
      </Card>
    )
  }
}
