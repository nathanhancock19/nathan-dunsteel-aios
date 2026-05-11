import { getMerScopes, getMerClaimsSchedule } from "@/lib/strumis/queries"

function formatCurrency(n: number | null): string {
  if (n == null) return "-"
  return new Intl.NumberFormat("en-AU", {
    style: "currency",
    currency: "AUD",
    maximumFractionDigits: 0,
  }).format(n)
}

function formatPct(n: number | null): string {
  if (n == null) return "-"
  return `${(n * 100).toFixed(0)}%`
}

function formatYearMonthShort(ym: string): string {
  const [y, m] = ym.split("-").map(Number)
  if (!y || !m) return ym
  return new Date(Date.UTC(y, m - 1, 1))
    .toLocaleDateString("en-AU", { month: "short", year: "2-digit" })
    .replace(" ", "'")
}

function thisYearMonth(): string {
  const d = new Date()
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}`
}

export async function ClaimsScheduleTable() {
  const [scopes, claims] = await Promise.all([getMerScopes(), getMerClaimsSchedule()])
  if (scopes.length === 0) {
    return <p className="text-sm text-muted">No claims data. Sync MER first.</p>
  }

  // Build month list (sorted unique year_month from claims)
  const monthSet = new Set<string>()
  for (const c of claims) monthSet.add(c.yearMonth)
  const months = Array.from(monthSet).sort()
  const currentYm = thisYearMonth()

  // Index claims by scope+month for fast lookup
  const claimByKey = new Map<string, { remainingValue: number | null; claimedPct: number | null }>()
  for (const c of claims) {
    claimByKey.set(`${c.scopeName}::${c.yearMonth}`, {
      remainingValue: c.remainingValue,
      claimedPct: c.claimedPct,
    })
  }

  // Filter to months from current onward (don't show ancient history by default)
  const futureMonths = months.filter((m) => m >= currentYm)
  const showMonths = futureMonths.length >= 3 ? futureMonths : months.slice(-12)

  return (
    <div className="overflow-x-auto rounded-xl border border-rule bg-ink/60">
      <table className="min-w-full text-xs">
        <thead className="border-b border-rule bg-ink">
          <tr>
            <th className="sticky left-0 z-10 bg-ink px-3 py-2 text-left font-semibold text-cream">Scope</th>
            <th className="px-3 py-2 text-right font-semibold text-cream">Value</th>
            <th className="px-3 py-2 text-right font-semibold text-cream">Remaining</th>
            <th className="px-3 py-2 text-right font-semibold text-cream">Claimed</th>
            {showMonths.map((m) => (
              <th key={m} className={`px-2 py-2 text-right font-semibold ${m === currentYm ? "bg-signal/10 text-signal" : "text-muted"}`}>
                {formatYearMonthShort(m)}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {scopes.map((s) => (
            <tr key={s.scopeName} className={`border-t border-rule/50 ${s.isVariation ? "bg-rule/10" : ""}`}>
              <td className="sticky left-0 z-10 bg-ink px-3 py-1.5 text-cream">
                {s.isVariation ? <span className="mr-1 text-signal">VAR</span> : null}
                {s.scopeName}
              </td>
              <td className="px-3 py-1.5 text-right text-cream">{formatCurrency(s.scopeValue)}</td>
              <td className="px-3 py-1.5 text-right text-cream">{formatCurrency(s.remainingValue)}</td>
              <td className="px-3 py-1.5 text-right text-cream">{formatPct(s.claimedPct)}</td>
              {showMonths.map((m) => {
                const c = claimByKey.get(`${s.scopeName}::${m}`)
                return (
                  <td
                    key={m}
                    className={`px-2 py-1.5 text-right text-muted ${m === currentYm ? "bg-signal/5" : ""}`}
                    title={c?.remainingValue != null ? `Remaining ${formatCurrency(c.remainingValue)}` : undefined}
                  >
                    {c?.claimedPct != null ? formatPct(c.claimedPct) : c?.remainingValue != null ? formatCurrency(c.remainingValue) : "-"}
                  </td>
                )
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
