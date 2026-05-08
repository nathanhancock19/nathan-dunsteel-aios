import { getTodaySiteActivity } from "@/lib/airtable"
import { Card, EmptyState, ErrorState } from "./Card"

export async function SiteActivityCard() {
  let summary
  try {
    summary = await getTodaySiteActivity()
  } catch (err) {
    return (
      <Card title="Today on site">
        <ErrorState message={err instanceof Error ? err.message : String(err)} />
      </Card>
    )
  }

  const projectScope = process.env.AIOS_PRIMARY_PROJECT_NUMBER
  const subtitle = projectScope ? `${summary.date} | Project ${projectScope}` : summary.date

  if (summary.totalDockets === 0) {
    return (
      <Card title="Today on site" subtitle={subtitle}>
        <EmptyState>No dockets submitted for today yet.</EmptyState>
      </Card>
    )
  }

  return (
    <Card title="Today on site" subtitle={subtitle}>
      <div className="grid grid-cols-3 gap-4">
        <Stat label="Dockets" value={summary.totalDockets} />
        <Stat label="Projects" value={summary.uniqueProjectIds.length} />
        <Stat label="Subs on site" value={summary.uniqueCompanyIds.length} />
      </div>
      <p className="mt-3 text-xs text-neutral-500">
        {summary.totalWorkerEntries} worker entries logged.
      </p>
    </Card>
  )
}

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <div>
      <div className="text-2xl font-semibold tracking-tight text-neutral-100">{value}</div>
      <div className="text-xs uppercase tracking-wider text-neutral-500">{label}</div>
    </div>
  )
}
