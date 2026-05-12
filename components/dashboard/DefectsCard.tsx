import { getNcrAnalytics } from "@/lib/drive/ncr-analytics"
import { Card } from "@/components/ui/Card"
import { EmptyState } from "@/components/ui/EmptyState"
import { ShieldAlert, ShieldCheck } from "lucide-react"
import Link from "next/link"

export async function DefectsCard() {
  if (!process.env.GOOGLE_NCR_FOLDER_ID) {
    return (
      <Card title="NCR Defects" icon={ShieldAlert}>
        <p className="text-sm text-fg-muted">
          Set <code className="rounded bg-surface-3 px-1 py-0.5 text-xs">GOOGLE_NCR_FOLDER_ID</code> to enable.
        </p>
      </Card>
    )
  }
  try {
    const s = await getNcrAnalytics()
    if (s.total === 0) {
      return (
        <Card title="NCR Defects" subtitle="411" icon={ShieldAlert}>
          <EmptyState icon={ShieldCheck} title="No NCR photos captured yet" />
        </Card>
      )
    }
    return (
      <Card title="NCR Defects" subtitle="411" icon={ShieldAlert}>
        <div className="grid grid-cols-3 gap-3 text-center">
          <Stat label="Total" value={s.total} />
          <Stat label="Top level" value={s.topLevel?.name ?? "-"} />
          <Stat label="Top type" value={s.topCategory?.count ?? 0} />
        </div>
        {s.topCategory && (
          <p className="mt-3 truncate text-[11px] text-fg-muted">
            Most common: <span className="text-fg">{s.topCategory.name}</span>
          </p>
        )}
        <div className="mt-2 flex items-center justify-end text-xs text-fg-muted">
          <Link href="/defects" className="hover:text-fg">View all</Link>
        </div>
      </Card>
    )
  } catch (err) {
    return (
      <Card title="NCR Defects" icon={ShieldAlert}>
        <p className="text-xs text-danger">{err instanceof Error ? err.message : String(err)}</p>
      </Card>
    )
  }
}

function Stat({ label, value, alert = false }: { label: string; value: number | string; alert?: boolean }) {
  return (
    <div>
      <p className={`text-xl font-semibold tracking-tight tabular-nums ${alert ? "text-warning" : "text-fg"}`}>{value}</p>
      <p className="text-[10px] uppercase tracking-wider text-fg-subtle">{label}</p>
    </div>
  )
}
