import { Suspense } from "react"
import { getDiaryEntriesThisWeek, type DiaryEntry } from "@/lib/notion/diary"

export const dynamic = "force-dynamic"

function formatDate(iso: string): string {
  // Add noon UTC offset so the Sydney TZ formatter never rolls to the
  // wrong calendar day around DST transitions or midnight.
  const d = new Date(iso + "T02:00:00.000Z")
  return d.toLocaleDateString("en-AU", { timeZone: "Australia/Sydney", weekday: "short", day: "numeric", month: "short" })
}

function isToday(iso: string): boolean {
  return iso === new Date().toLocaleDateString("en-CA", { timeZone: "Australia/Sydney" })
}

function DayCard({ date, entries }: { date: string; entries: DiaryEntry[] }) {
  const perf = entries.filter((e) => e.source === "performance")
  const subcon = entries.filter((e) => e.source === "subcon")
  const hasFlag = entries.some((e) => e.safetyIncident || e.builderDelays)
  const today = isToday(date)

  return (
    <div className={`rounded-xl border p-4 ${today ? "border-amber-500/40 bg-amber-500/5" : "border-rule bg-ink/40"}`}>
      <div className="mb-3 flex items-center justify-between">
        <p className={`text-sm font-semibold ${today ? "text-amber-400" : "text-cream"}`}>
          {formatDate(date)}
          {today ? <span className="ml-2 text-[10px] uppercase tracking-wider opacity-70">Today</span> : null}
        </p>
        {hasFlag ? (
          <span className="rounded bg-yellow-500/20 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-yellow-300">
            flagged
          </span>
        ) : null}
      </div>

      <div className="space-y-3">
        {perf.length > 0 && (
          <div>
            <p className="mb-1 text-[10px] uppercase tracking-wider text-muted">Performance</p>
            {perf.map((e) => (
              <div key={e.id} className="text-sm text-fg">
                {e.crewOnsite != null && (
                  <span className="mr-2 font-medium text-cream">{e.crewOnsite} on site</span>
                )}
                {e.weather && <span className="text-muted">{e.weather}</span>}
                {e.finishTime && (
                  <span className="ml-2 text-muted">Finish {e.finishTime}</span>
                )}
                {e.workCompleted && (
                  <p className="mt-0.5 text-xs text-muted line-clamp-2">{e.workCompleted}</p>
                )}
              </div>
            ))}
          </div>
        )}

        {subcon.length > 0 && (
          <div>
            <p className="mb-1 text-[10px] uppercase tracking-wider text-muted">Subcontractors</p>
            {subcon.map((e) => (
              <div key={e.id} className="text-sm">
                {e.crewNames.length > 0 ? (
                  <div className="flex flex-wrap gap-1">
                    {e.crewNames.map((name) => (
                      <span
                        key={name}
                        className="rounded bg-rule/40 px-2 py-0.5 text-[11px] text-cream"
                      >
                        {name}
                      </span>
                    ))}
                  </div>
                ) : e.crewOnsite != null ? (
                  <span className="font-medium text-cream">{e.crewOnsite} on site</span>
                ) : null}
                {e.workCompleted && (
                  <p className="mt-0.5 text-xs text-muted line-clamp-2">{e.workCompleted}</p>
                )}
              </div>
            ))}
          </div>
        )}

        {perf.length === 0 && subcon.length === 0 && (
          <p className="text-xs text-muted">No entries logged.</p>
        )}
      </div>
    </div>
  )
}

async function WeekGrid() {
  const entries = await getDiaryEntriesThisWeek()

  if (entries.length === 0) {
    return <p className="text-sm text-muted">No diary entries this week.</p>
  }

  const byDate = new Map<string, DiaryEntry[]>()
  for (const e of entries) {
    if (!e.date) continue
    const list = byDate.get(e.date) ?? []
    list.push(e)
    byDate.set(e.date, list)
  }

  const dates = Array.from(byDate.keys()).sort((a, b) => b.localeCompare(a))

  return (
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
      {dates.map((date) => (
        <DayCard key={date} date={date} entries={byDate.get(date)!} />
      ))}
    </div>
  )
}

export default function DiaryPage() {
  const project = process.env.AIOS_PRIMARY_PROJECT_NUMBER ?? "411"
  return (
    <section className="space-y-5">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight text-cream">Project {project} - On Site This Week</h1>
        <p className="mt-1 text-sm text-muted">Performance crew and subcontractors from diary entries.</p>
      </div>
      <Suspense fallback={<div className="h-40 animate-pulse rounded-xl bg-rule/20" />}>
        <WeekGrid />
      </Suspense>
    </section>
  )
}
