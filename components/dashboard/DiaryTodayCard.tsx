import { getDiaryEntriesForDate } from "@/lib/notion/diary"
import { Card, EmptyState, ErrorState, ConfigState } from "./Card"
import { DiaryEntryCard } from "@/components/diary/DiaryEntry"

export async function DiaryTodayCard() {
  if (!process.env.NOTION_PERFORMANCE_DIARY_DB && !process.env.NOTION_SUBCON_DIARY_DB) {
    return (
      <Card title="Diary today">
        <ConfigState envVar="NOTION_PERFORMANCE_DIARY_DB" />
      </Card>
    )
  }
  try {
    const entries = await getDiaryEntriesForDate()
    if (entries.length === 0) {
      return (
        <Card title="Diary today" subtitle="Notion">
          <EmptyState>No entries logged today.</EmptyState>
        </Card>
      )
    }
    const flags = entries.filter((e) => e.safetyIncident || e.builderDelays).length
    return (
      <Card title="Diary today" subtitle={`${entries.length} entries${flags > 0 ? `, ${flags} flagged` : ""}`}>
        <ul className="space-y-2">
          {entries.slice(0, 4).map((e) => (
            <li key={e.id}>
              <DiaryEntryCard entry={e} />
            </li>
          ))}
        </ul>
        {entries.length > 4 ? (
          <p className="mt-2 text-xs text-muted">
            <a href="/diary" className="hover:text-signal">+{entries.length - 4} more</a>
          </p>
        ) : null}
      </Card>
    )
  } catch (err) {
    return (
      <Card title="Diary today">
        <ErrorState message={err instanceof Error ? err.message : String(err)} />
      </Card>
    )
  }
}
