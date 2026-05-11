import { getDiaryEntriesForDate } from "@/lib/notion/diary"
import { Card } from "@/components/ui/Card"
import { EmptyState } from "@/components/ui/EmptyState"
import { Pill } from "@/components/ui/Pill"
import { BookOpen, CalendarX } from "lucide-react"
import { DiaryEntryCard } from "@/components/diary/DiaryEntry"
import Link from "next/link"

export async function DiaryTodayCard() {
  if (!process.env.NOTION_PERFORMANCE_DIARY_DB && !process.env.NOTION_SUBCON_DIARY_DB) {
    return (
      <Card title="Diary today" icon={BookOpen}>
        <p className="text-sm text-fg-muted">Diary databases not configured.</p>
      </Card>
    )
  }
  try {
    const entries = await getDiaryEntriesForDate()
    if (entries.length === 0) {
      return (
        <Card title="Diary today" icon={BookOpen}>
          <EmptyState icon={CalendarX} title="No entries today" description="Voice memos compile at 4:30pm." />
        </Card>
      )
    }
    const flags = entries.filter((e) => e.safetyIncident || e.builderDelays).length
    return (
      <Card
        title="Diary today"
        icon={BookOpen}
        action={flags > 0 ? <Pill tone="warning" size="xs">{flags} flagged</Pill> : null}
        subtitle={`${entries.length} ${entries.length === 1 ? "entry" : "entries"}`}
      >
        <ul className="space-y-2">
          {entries.slice(0, 3).map((e) => (
            <li key={e.id}>
              <DiaryEntryCard entry={e} />
            </li>
          ))}
        </ul>
        {entries.length > 3 ? (
          <p className="mt-2 text-xs">
            <Link href="/diary" className="text-fg-muted hover:text-fg">+{entries.length - 3} more &rarr;</Link>
          </p>
        ) : null}
      </Card>
    )
  } catch (err) {
    return (
      <Card title="Diary today" icon={BookOpen}>
        <p className="text-xs text-danger">{err instanceof Error ? err.message : String(err)}</p>
      </Card>
    )
  }
}
