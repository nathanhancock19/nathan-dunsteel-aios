import Link from "next/link"
import { getDeliveriesForCurrentWeek } from "@/lib/sheets/deliveries"
import { Card } from "@/components/ui/Card"
import { EmptyState } from "@/components/ui/EmptyState"
import { Truck, CalendarDays } from "lucide-react"
import { sydneyTodayIso } from "@/lib/utils/today"

const WEEKDAY_SHORT = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"]

export async function DeliveriesCard() {
  const projectFilter = process.env.AIOS_PRIMARY_PROJECT_NUMBER
  const today = sydneyTodayIso()
  let days
  try {
    days = await getDeliveriesForCurrentWeek({ projectFilter })
  } catch (err) {
    return (
      <Card title="Deliveries this week" icon={Truck}>
        <p className="text-sm text-danger">
          <span className="font-semibold">Error:</span> {err instanceof Error ? err.message : String(err)}
        </p>
      </Card>
    )
  }

  const totalJobs = days.reduce((n, d) => n + d.jobs.length, 0)
  if (totalJobs === 0) {
    return (
      <Card title="Deliveries this week" subtitle="Mon-Sun" icon={Truck}>
        <EmptyState
          icon={CalendarDays}
          title="Nothing scheduled"
          description={
            projectFilter
              ? `No deliveries for project ${projectFilter} this week.`
              : "No deliveries this week."
          }
        />
      </Card>
    )
  }

  return (
    <Card title="Deliveries this week" subtitle={`${totalJobs} delivery${totalJobs === 1 ? "" : "ies"}`} icon={Truck}>
      <div className="grid grid-cols-7 gap-1">
        {days.map((day, i) => {
          const count = day.jobs.length
          const isToday = day.date === today
          const dayShort = WEEKDAY_SHORT[i]
          const dayNum = day.date.slice(8)
          return (
            <Link
              key={day.date}
              href={`/deliveries?date=${day.date}`}
              className={`flex flex-col items-center rounded-md border px-1.5 py-2 text-center transition-colors ${
                isToday
                  ? "border-cream bg-cream/10"
                  : count > 0
                    ? "border-rule bg-surface-2 hover:bg-highlight"
                    : "border-rule/40 bg-transparent text-fg-subtle hover:bg-surface-2"
              }`}
              title={count === 0 ? "No deliveries" : `${count} delivery${count === 1 ? "" : "ies"}`}
            >
              <span className="text-[10px] font-semibold uppercase tracking-wider text-fg-subtle">
                {dayShort}
              </span>
              <span className={`mono-nums text-base font-semibold ${isToday ? "text-cream" : "text-fg"}`}>
                {dayNum}
              </span>
              <span
                className={`mt-0.5 mono-nums text-[10px] ${
                  count > 0 ? "text-cream" : "text-fg-subtle"
                }`}
              >
                {count > 0 ? `${count}` : "—"}
              </span>
            </Link>
          )
        })}
      </div>
      <ul className="mt-4 space-y-3 text-sm">
        {days
          .filter((d) => d.jobs.length > 0)
          .map((day) => (
            <li key={day.date}>
              <p className="mb-1.5 text-[10px] font-semibold uppercase tracking-wider text-fg-subtle">
                {day.dayName} {day.date.slice(8)} {day.monthLabel}
                {day.date === today ? " · today" : ""}
              </p>
              <ul className="space-y-1.5">
                {day.jobs.map((job) => (
                  <li
                    key={`${day.date}-${job.jobIndex}`}
                    className="rounded-md border border-rule bg-surface-2 p-2.5"
                  >
                    <div className="flex items-baseline justify-between gap-2">
                      <span className="font-medium text-fg">{job.project || "(no project)"}</span>
                      {job.time ? (
                        <span className="shrink-0 text-xs text-fg-muted">{job.time}</span>
                      ) : null}
                    </div>
                    {job.details ? (
                      <p className="mt-0.5 whitespace-pre-line text-fg-muted">{job.details}</p>
                    ) : null}
                    <div className="mt-1 flex flex-wrap gap-2 text-[11px] text-fg-subtle">
                      {job.truck ? <span>{job.truck}</span> : null}
                      {job.pm ? <span>PM: {job.pm}</span> : null}
                      {job.status ? <span>{job.status}</span> : null}
                    </div>
                  </li>
                ))}
              </ul>
            </li>
          ))}
      </ul>
    </Card>
  )
}
