import { getDeliveriesForWeek } from "@/lib/sheets/deliveries"
import { Card } from "@/components/ui/Card"
import { EmptyState } from "@/components/ui/EmptyState"
import { Truck, CalendarDays } from "lucide-react"

export async function DeliveriesCard() {
  const projectFilter = process.env.AIOS_PRIMARY_PROJECT_NUMBER
  let days
  try {
    days = await getDeliveriesForWeek({ projectFilter })
  } catch (err) {
    return (
      <Card title="Deliveries this week" icon={Truck}>
        <p className="text-sm text-danger">
          <span className="font-semibold">Error:</span> {err instanceof Error ? err.message : String(err)}
        </p>
      </Card>
    )
  }

  const daysWithJobs = days.filter((d) => d.jobs.length > 0)

  if (daysWithJobs.length === 0) {
    return (
      <Card title="Deliveries this week" subtitle="Google Sheets" icon={Truck}>
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
    <Card title="Deliveries this week" subtitle="Google Sheets" icon={Truck}>
      <ul className="space-y-4 text-sm">
        {daysWithJobs.map((day) => (
          <li key={day.date}>
            <p className="mb-1.5 text-[10px] font-semibold uppercase tracking-wider text-fg-subtle">
              {day.dayName} {day.date.slice(8)} {day.monthLabel}
            </p>
            <ul className="space-y-1.5">
              {day.jobs.map((job) => (
                <li
                  key={job.jobIndex}
                  className="rounded-md border border-border bg-surface-2 p-2.5"
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
