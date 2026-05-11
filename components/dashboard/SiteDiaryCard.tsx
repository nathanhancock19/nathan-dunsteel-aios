import { getRecentSiteDiaryEntries } from "@/lib/notion"
import { Card, ConfigState, EmptyState, ErrorState } from "./Card"

export async function SiteDiaryCard() {
  if (!process.env.NOTION_SITE_DIARY_DATABASE_ID) {
    return (
      <Card title="Recent site diary">
        <ConfigState envVar="NOTION_SITE_DIARY_DATABASE_ID" />
      </Card>
    )
  }
  try {
    const entries = await getRecentSiteDiaryEntries(5)
    if (entries.length === 0) {
      return (
        <Card title="Recent site diary">
          <EmptyState>No diary entries.</EmptyState>
        </Card>
      )
    }
    return (
      <Card title="Recent site diary" subtitle="Notion">
        <ul className="space-y-2 text-sm">
          {entries.map((e) => (
            <li key={e.id}>
              <a
                href={e.url}
                target="_blank"
                rel="noreferrer"
                className="text-neutral-200 hover:text-fg"
              >
                {e.title}
              </a>
              {e.project ? (
                <span className="ml-2 text-xs text-neutral-500">{e.project}</span>
              ) : null}
              {e.date ? (
                <span className="ml-2 text-xs text-neutral-500">{e.date}</span>
              ) : null}
            </li>
          ))}
        </ul>
      </Card>
    )
  } catch (err) {
    return (
      <Card title="Recent site diary">
        <ErrorState message={err instanceof Error ? err.message : String(err)} />
      </Card>
    )
  }
}
