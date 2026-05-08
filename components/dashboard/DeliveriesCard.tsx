import { getDeliveriesForWeek } from "@/lib/sheets/deliveries"
import { Card, EmptyState, ErrorState } from "./Card"

export async function DeliveriesCard() {
  const projectFilter = process.env.AIOS_PRIMARY_PROJECT_NUMBER
  let days
  try {
    days = await getDeliveriesForWeek({ projectFilter })
  } catch (err) {
    return (
      <Card title="Deliveries this week">
        <ErrorState message={err instanceof Error ? err.message : String(err)} />
      </Card>
    )
  }

  const daysWithJobs = days.filter((d) => d.jobs.length > 0)

  if (daysWithJobs.length === 0) {
    return (
      <Card title="Deliveries this week" subtitle="Google Sheets">
        <EmptyState>
          {projectFilter
            ? `Nothing scheduled for project ${projectFilter} this week.`
            : "Nothing scheduled this week."}
        </EmptyState>
      </Card>
    )
  }

  return (
    <Card title="Deliveries this week" subtitle="Google Sheets">
      <ul className="space-y-4 text-sm">
        {daysWithJobs.map((day) => (
          <li key={day.date}>
            <p className="mb-1.5 text-xs font-semibold uppercase tracking-wider text-neutral-500">
              {day.dayName} {day.date.slice(8)} {day.monthLabel}
            </p>
            <ul className="space-y-2">
              {day.jobs.map((job) => (
                <li
                  key={job.jobIndex}
                  className="rounded-md border border-neutral-800 bg-neutral-950 p-3"
                >
                  <div className="flex items-baseline justify-between gap-2">
                    <span className="font-semibold text-neutral-100">
                      {job.project || "(no project)"}
                    </span>
                    {job.time ? (
                      <span className="shrink-0 text-xs text-neutral-500">{job.time}</span>
                    ) : null}
                  </div>
                  {job.details ? (
                    <p className="mt-0.5 whitespace-pre-line text-neutral-300">{job.details}</p>
                  ) : null}
                  <div className="mt-1.5 flex flex-wrap gap-2 text-xs text-neutral-500">
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
