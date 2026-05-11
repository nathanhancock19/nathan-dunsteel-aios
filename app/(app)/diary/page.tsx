import { Suspense } from "react"
import { getRecentDiaryEntries, getDiaryFlaggedEntries } from "@/lib/notion/diary"
import { DiaryEntryCard } from "@/components/diary/DiaryEntry"

export const dynamic = "force-dynamic"

async function RecentEntries() {
  const entries = await getRecentDiaryEntries(20)
  if (entries.length === 0) {
    return <p className="text-sm text-muted">No diary entries.</p>
  }
  return (
    <ul className="space-y-2">
      {entries.map((e) => (
        <li key={e.id}>
          <DiaryEntryCard entry={e} />
        </li>
      ))}
    </ul>
  )
}

async function FlaggedEntries() {
  const entries = await getDiaryFlaggedEntries({ days: 14 })
  if (entries.length === 0) {
    return <p className="text-sm text-muted">No flagged entries in the last 14 days.</p>
  }
  return (
    <ul className="space-y-2">
      {entries.map((e) => (
        <li key={e.id}>
          <DiaryEntryCard entry={e} />
        </li>
      ))}
    </ul>
  )
}

export default function DiaryPage() {
  const project = process.env.AIOS_PRIMARY_PROJECT_NUMBER ?? "411"
  return (
    <section className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight text-cream">Project {project} Diary</h1>
        <p className="mt-1 text-sm text-muted">Performance Site Diary plus Dunsteel Subcontractors Diary.</p>
      </div>

      <div>
        <h2 className="mb-2 text-sm font-semibold uppercase tracking-wider text-yellow-400">Flagged (last 14 days)</h2>
        <Suspense fallback={<div className="h-12 animate-pulse rounded bg-rule/20" />}>
          <FlaggedEntries />
        </Suspense>
      </div>

      <div>
        <h2 className="mb-2 text-sm font-semibold uppercase tracking-wider text-muted">Recent entries</h2>
        <Suspense fallback={<div className="h-32 animate-pulse rounded bg-rule/20" />}>
          <RecentEntries />
        </Suspense>
      </div>
    </section>
  )
}
