import { getDeliveriesForDay } from "@/lib/sheets/deliveries"
import { Card, EmptyState, ErrorState } from "./Card"

export async function DeliveriesCard() {
  const projectFilter = process.env.AIOS_PRIMARY_PROJECT_NUMBER
  let result
  try {
    result = await getDeliveriesForDay({ projectFilter })
  } catch (err) {
    return (
      <Card title="Deliveries today">
        <ErrorState message={err instanceof Error ? err.message : String(err)} />
      </Card>
    )
  }

  const subtitle = projectFilter
    ? `${result.dayName} ${result.monthLabel} | Project ${projectFilter} | source: Google Sheets (interim)`
    : `${result.dayName} ${result.monthLabel} | source: Google Sheets (interim)`

  if (result.jobs.length === 0) {
    return (
      <Card title="Deliveries today" subtitle={subtitle}>
        <EmptyState>
          {projectFilter
            ? `Nothing scheduled for project ${projectFilter} today.`
            : "Nothing scheduled today."}
        </EmptyState>
      </Card>
    )
  }

  return (
    <Card title="Deliveries today" subtitle={subtitle}>
      <ul className="space-y-3 text-sm">
        {result.jobs.map((job) => (
          <li
            key={job.jobIndex}
            className="rounded-md border border-neutral-800 bg-neutral-950 p-3"
          >
            <div className="mb-1 flex items-baseline justify-between">
              <span className="font-semibold text-neutral-100">
                {job.project || `(no project)`}
              </span>
              {job.time ? (
                <span className="text-xs text-neutral-500">{job.time}</span>
              ) : null}
            </div>
            <p className="whitespace-pre-line text-neutral-300">{job.details}</p>
            <div className="mt-2 flex flex-wrap gap-2 text-xs text-neutral-500">
              {job.truck ? <span>{job.truck}</span> : null}
              {job.pm ? <span>PM: {job.pm}</span> : null}
              {job.signedDocket ? <span>Signed: {job.signedDocket}</span> : null}
              {job.status ? <span>Status: {job.status}</span> : null}
            </div>
          </li>
        ))}
      </ul>
    </Card>
  )
}
