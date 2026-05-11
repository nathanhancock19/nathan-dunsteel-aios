import { getMerSummary, getMerSyncStatus } from "@/lib/strumis/queries"
import { Card, EmptyState } from "@/components/dashboard/Card"

function formatCurrency(n: number): string {
  return new Intl.NumberFormat("en-AU", {
    style: "currency",
    currency: "AUD",
    maximumFractionDigits: 0,
  }).format(n)
}

function formatPct(n: number): string {
  return `${(n * 100).toFixed(1)}%`
}

function formatYearMonth(ym: string): string {
  const [y, m] = ym.split("-").map(Number)
  if (!y || !m) return ym
  return new Date(Date.UTC(y, m - 1, 1)).toLocaleDateString("en-AU", { month: "long", year: "numeric" })
}

function ageLabel(hours: number | null): string {
  if (hours == null) return "never synced"
  if (hours < 1) return `${Math.round(hours * 60)} min ago`
  if (hours < 24) return `${Math.round(hours)} hr ago`
  return `${Math.round(hours / 24)} d ago`
}

export async function ClaimsSummaryCard({ variant = "compact" }: { variant?: "compact" | "full" }) {
  const [summary, sync] = await Promise.all([getMerSummary(), getMerSyncStatus()])

  if (summary.totalScopeValue === 0 && (sync.lastScopeCount ?? 0) === 0) {
    return (
      <Card title="Budget (claims)" subtitle="MER">
        <EmptyState>No MER data yet. Run /api/sync/mer or wait for the daily 1pm sync.</EmptyState>
      </Card>
    )
  }

  const remaining = summary.totalRemainingValue
  const value = summary.totalScopeValue
  const claimedValue = value - remaining
  const monthLabel = formatYearMonth(summary.thisMonthYearMonth)

  return (
    <Card
      title={variant === "full" ? `Project ${summary.projectNumber} - Claims` : "Budget (claims)"}
      subtitle={`MER: ${ageLabel(sync.ageHours)}`}
    >
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Stat label="Contract value" value={formatCurrency(value)} />
        <Stat label="Claimed to date" value={formatCurrency(claimedValue)} sub={formatPct(summary.overallClaimedPct)} />
        <Stat label="Remaining" value={formatCurrency(remaining)} />
        <Stat label={`Claimed ${monthLabel.split(" ")[0]}`} value={formatCurrency(summary.thisMonthClaimedValue)} />
      </div>
      {summary.variationsCount > 0 ? (
        <p className="mt-3 text-xs text-muted">
          Variations: <span className="text-cream">{summary.variationsCount}</span> totalling{" "}
          <span className="text-cream">{formatCurrency(summary.variationsValue)}</span>
        </p>
      ) : null}
    </Card>
  )
}

function Stat({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <div>
      <p className="text-[10px] uppercase tracking-wider text-muted">{label}</p>
      <p className="mt-0.5 text-base font-semibold tracking-tight text-cream">{value}</p>
      {sub ? <p className="text-[11px] text-muted">{sub}</p> : null}
    </div>
  )
}
