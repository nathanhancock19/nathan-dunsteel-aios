import { getDeliveriesForWeek, type DeliveriesForDay } from "@/lib/sheets/deliveries"

export const dynamic = "force-dynamic"

export default async function DeliveriesPage() {
  const projectFilter = process.env.AIOS_PRIMARY_PROJECT_NUMBER
  let days: DeliveriesForDay[] = []
  let error: string | null = null

  try {
    days = await getDeliveriesForWeek({ projectFilter })
  } catch (err) {
    error = err instanceof Error ? err.message : String(err)
  }

  const daysWithJobs = days.filter((d) => d.jobs.length > 0)

  return (
    <div className="max-w-2xl">
      <div className="mb-6">
        <h1 className="text-lg font-semibold text-neutral-100">Deliveries</h1>
        <p className="text-sm text-neutral-500">
          {projectFilter ? `Project ${projectFilter} — ` : ""}Next 7 days
        </p>
      </div>

      {error && (
        <div className="mb-4 rounded-md border border-red-900 bg-red-950 px-4 py-3 text-sm text-red-300">
          {error}
        </div>
      )}

      {daysWithJobs.length === 0 && !error && (
        <p className="text-sm text-neutral-500">
          {projectFilter
            ? `Nothing scheduled for project ${projectFilter} in the next 7 days.`
            : "Nothing scheduled in the next 7 days."}
        </p>
      )}

      <div className="space-y-8">
        {daysWithJobs.map((day) => (
          <section key={day.date}>
            <h2 className="mb-3 text-xs font-semibold uppercase tracking-wider text-neutral-500">
              {day.dayName} {day.date.slice(8)} {day.monthLabel}
            </h2>
            <ul className="space-y-3">
              {day.jobs.map((job) => (
                <li
                  key={job.jobIndex}
                  className="rounded-lg border border-neutral-800 bg-neutral-900 p-4"
                >
                  <div className="mb-1 flex items-start justify-between gap-2">
                    <span className="font-semibold text-neutral-100">
                      {job.project || "(no project)"}
                    </span>
                    {job.time ? (
                      <span className="shrink-0 rounded-full bg-neutral-800 px-2 py-0.5 text-xs text-neutral-400">
                        {job.time}
                      </span>
                    ) : null}
                  </div>

                  {job.details ? (
                    <p className="whitespace-pre-line text-sm text-neutral-300">{job.details}</p>
                  ) : null}

                  <div className="mt-2 flex flex-wrap gap-3 text-xs text-neutral-500">
                    {job.truck ? (
                      <span>
                        <span className="text-neutral-600">Truck:</span> {job.truck}
                      </span>
                    ) : null}
                    {job.pm ? (
                      <span>
                        <span className="text-neutral-600">PM:</span> {job.pm}
                      </span>
                    ) : null}
                    {job.contact ? (
                      <span>
                        <span className="text-neutral-600">Contact:</span> {job.contact}
                      </span>
                    ) : null}
                    {job.signedDocket ? (
                      <span>
                        <span className="text-neutral-600">Docket:</span> {job.signedDocket}
                      </span>
                    ) : null}
                    {job.status ? (
                      <span>
                        <span className="text-neutral-600">Status:</span> {job.status}
                      </span>
                    ) : null}
                    {job.notes ? (
                      <span>
                        <span className="text-neutral-600">Notes:</span> {job.notes}
                      </span>
                    ) : null}
                  </div>
                </li>
              ))}
            </ul>
          </section>
        ))}
      </div>
    </div>
  )
}
