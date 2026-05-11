import { getDefectsSummary } from "@/lib/notion/defects"
import { Card, EmptyState, ErrorState, ConfigState } from "./Card"

export async function DefectsCard() {
  if (!process.env.NOTION_DEFECTS_411_DB) {
    return (
      <Card title="Defects">
        <ConfigState envVar="NOTION_DEFECTS_411_DB" />
      </Card>
    )
  }
  try {
    const s = await getDefectsSummary()
    if (s.total === 0) {
      return (
        <Card title="Defects" subtitle="Notion">
          <EmptyState>No defects logged.</EmptyState>
        </Card>
      )
    }
    const open = (s.byStatus["Identified"] ?? 0) + (s.byStatus["In Progress"] ?? 0)
    const high = (s.bySeverity["High"] ?? 0) + (s.bySeverity["Critical"] ?? 0)
    return (
      <Card title="Defects" subtitle="411">
        <div className="grid grid-cols-3 gap-3 text-center">
          <Stat label="Total" value={s.total} />
          <Stat label="Open" value={open} alert={open > 0} />
          <Stat label="High sev" value={high} alert={high > 0} />
        </div>
        <p className="mt-3 text-xs text-muted">
          <a href="/defects" className="hover:text-signal">View all</a>
          {s.totalCostImpact > 0 ? (
            <span className="ml-3">
              Cost impact:{" "}
              <span className="text-cream">
                {new Intl.NumberFormat("en-AU", {
                  style: "currency",
                  currency: "AUD",
                  maximumFractionDigits: 0,
                }).format(s.totalCostImpact)}
              </span>
            </span>
          ) : null}
        </p>
      </Card>
    )
  } catch (err) {
    return (
      <Card title="Defects">
        <ErrorState message={err instanceof Error ? err.message : String(err)} />
      </Card>
    )
  }
}

function Stat({ label, value, alert = false }: { label: string; value: number; alert?: boolean }) {
  return (
    <div>
      <p className={`text-xl font-semibold tracking-tight ${alert ? "text-signal" : "text-cream"}`}>{value}</p>
      <p className="text-[10px] uppercase tracking-wider text-muted">{label}</p>
    </div>
  )
}
