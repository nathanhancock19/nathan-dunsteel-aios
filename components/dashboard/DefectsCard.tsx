import { getDefectsSummary } from "@/lib/notion/defects"
import { Card } from "@/components/ui/Card"
import { EmptyState } from "@/components/ui/EmptyState"
import { ShieldAlert, ShieldCheck } from "lucide-react"
import Link from "next/link"

export async function DefectsCard() {
  if (!process.env.NOTION_DEFECTS_411_DB) {
    return (
      <Card title="Defects" icon={ShieldAlert}>
        <p className="text-sm text-fg-muted">
          Set <code className="rounded bg-surface-3 px-1 py-0.5 text-xs">NOTION_DEFECTS_411_DB</code> to enable.
        </p>
      </Card>
    )
  }
  try {
    const s = await getDefectsSummary()
    if (s.total === 0) {
      return (
        <Card title="Defects" subtitle="411" icon={ShieldAlert}>
          <EmptyState icon={ShieldCheck} title="No defects logged" />
        </Card>
      )
    }
    const high = (s.bySeverity["High"] ?? 0) + (s.bySeverity["Critical"] ?? 0)
    const rectified = s.byStatus["Rectified"] ?? 0
    return (
      <Card title="Defects" subtitle="411" icon={ShieldAlert}>
        <div className="grid grid-cols-3 gap-3 text-center">
          <Stat label="Total" value={s.total} />
          <Stat label="Rectified" value={rectified} />
          <Stat label="High sev" value={high} alert={high > 0} />
        </div>
        <div className="mt-3 flex items-center justify-between text-xs text-fg-muted">
          <Link href="/defects" className="hover:text-fg">View all</Link>
          {s.totalCostImpact > 0 ? (
            <span>
              Cost impact:{" "}
              <span className="text-fg">
                {new Intl.NumberFormat("en-AU", {
                  style: "currency",
                  currency: "AUD",
                  maximumFractionDigits: 0,
                }).format(s.totalCostImpact)}
              </span>
            </span>
          ) : null}
        </div>
      </Card>
    )
  } catch (err) {
    return (
      <Card title="Defects" icon={ShieldAlert}>
        <p className="text-xs text-danger">{err instanceof Error ? err.message : String(err)}</p>
      </Card>
    )
  }
}

function Stat({ label, value, alert = false }: { label: string; value: number; alert?: boolean }) {
  return (
    <div>
      <p className={`text-xl font-semibold tracking-tight tabular-nums ${alert ? "text-warning" : "text-fg"}`}>{value}</p>
      <p className="text-[10px] uppercase tracking-wider text-fg-subtle">{label}</p>
    </div>
  )
}
