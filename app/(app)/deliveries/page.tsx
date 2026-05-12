import { getDeliveriesForWeek, type DeliveriesForDay, type DeliveryJob } from "@/lib/sheets/deliveries"

export const dynamic = "force-dynamic"

function isToday(date: string): boolean {
  return date === new Date().toLocaleDateString("en-CA", { timeZone: "Australia/Sydney" })
}

function isTomorrow(date: string): boolean {
  const tomorrow = new Date()
  tomorrow.setDate(tomorrow.getDate() + 1)
  return date === tomorrow.toLocaleDateString("en-CA", { timeZone: "Australia/Sydney" })
}

function statusBadge(status: string | undefined): string {
  if (!status) return ""
  const s = status.toLowerCase()
  if (s.includes("confirm") || s.includes("booked")) return "bg-emerald-500/20 text-emerald-300"
  if (s.includes("pending") || s.includes("tbc")) return "bg-yellow-500/20 text-yellow-300"
  if (s.includes("cancel")) return "bg-red-500/20 text-red-300"
  return "bg-rule/30 text-muted"
}

function JobCard({ job }: { job: DeliveryJob }) {
  return (
    <div className="rounded-lg border border-rule bg-ink/40 p-3">
      <div className="flex items-start justify-between gap-2">
        <p className="font-medium text-cream">{job.project || job.details || "(no project)"}</p>
        {job.time ? (
          <span className="shrink-0 rounded-full border border-rule bg-rule/20 px-2 py-0.5 text-[10px] font-medium text-muted">
            {job.time}
          </span>
        ) : null}
      </div>

      {job.details && job.project && (
        <p className="mt-1 text-xs text-muted">{job.details}</p>
      )}

      <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-[11px] text-muted">
        {job.truck ? <span><span className="text-fg-subtle">Truck:</span> {job.truck}</span> : null}
        {job.pm ? <span><span className="text-fg-subtle">PM:</span> {job.pm}</span> : null}
        {job.contact ? <span><span className="text-fg-subtle">Contact:</span> {job.contact}</span> : null}
        {job.signedDocket ? <span><span className="text-fg-subtle">Docket:</span> {job.signedDocket}</span> : null}
        {job.notes ? <span className="text-muted">{job.notes}</span> : null}
      </div>

      {job.status ? (
        <div className="mt-2">
          <span className={`rounded px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider ${statusBadge(job.status)}`}>
            {job.status}
          </span>
        </div>
      ) : null}
    </div>
  )
}

function DayCard({ day }: { day: DeliveriesForDay }) {
  const today = isToday(day.date)
  const tomorrow = isTomorrow(day.date)

  return (
    <div className={`rounded-xl border p-4 ${today ? "border-amber-500/40 bg-amber-500/5" : "border-rule bg-ink/40"}`}>
      <div className="mb-3 flex items-center justify-between">
        <div>
          <p className={`font-semibold ${today ? "text-amber-400" : "text-cream"}`}>
            {day.dayName}
            {today ? <span className="ml-2 text-[10px] uppercase tracking-wider opacity-70">Today</span> : null}
            {tomorrow ? <span className="ml-2 text-[10px] uppercase tracking-wider opacity-70">Tomorrow</span> : null}
          </p>
          <p className="text-xs text-muted">
            {day.date.slice(8)} {day.monthLabel}
          </p>
        </div>
        <span className="rounded-full border border-rule bg-rule/20 px-2.5 py-0.5 text-xs font-semibold text-cream">
          {day.jobs.length} {day.jobs.length === 1 ? "delivery" : "deliveries"}
        </span>
      </div>

      <div className="space-y-2">
        {day.jobs.map((job) => (
          <JobCard key={job.jobIndex} job={job} />
        ))}
      </div>
    </div>
  )
}

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
  const totalThisWeek = daysWithJobs.reduce((n, d) => n + d.jobs.length, 0)

  return (
    <section className="space-y-5">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight text-cream">Deliveries</h1>
        <p className="mt-1 text-sm text-muted">
          {projectFilter ? `Project ${projectFilter} - ` : ""}Next 7 days
          {totalThisWeek > 0 ? ` - ${totalThisWeek} scheduled` : ""}
        </p>
      </div>

      {error ? (
        <div className="rounded-xl border border-red-500/30 bg-red-500/10 p-4 text-sm text-red-300">
          {error}
        </div>
      ) : null}

      {daysWithJobs.length === 0 && !error ? (
        <div className="rounded-xl border border-rule bg-ink/40 p-6 text-center">
          <p className="text-sm text-muted">
            {projectFilter
              ? `Nothing scheduled for project ${projectFilter} in the next 7 days.`
              : "Nothing scheduled in the next 7 days."}
          </p>
        </div>
      ) : null}

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {daysWithJobs.map((day) => (
          <DayCard key={day.date} day={day} />
        ))}
      </div>
    </section>
  )
}
