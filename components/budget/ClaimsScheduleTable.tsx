import React from "react"
import { getMerScopes, getMerClaimsSchedule } from "@/lib/strumis/queries"

function formatCurrency(n: number | null | undefined): string {
  if (n == null) return "-"
  return new Intl.NumberFormat("en-AU", {
    style: "currency",
    currency: "AUD",
    maximumFractionDigits: 0,
  }).format(n)
}

function formatPct(n: number | null | undefined): string {
  if (n == null) return ""
  return `${(n * 100).toFixed(0)}%`
}

function formatYearMonthShort(ym: string): string {
  const [y, m] = ym.split("-").map(Number)
  if (!y || !m) return ym
  return new Date(Date.UTC(y, m - 1, 1)).toLocaleDateString("en-AU", {
    month: "short",
    year: "2-digit",
  })
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

  const monthSet = new Set<string>()
  for (const c of claims) monthSet.add(c.yearMonth)
  const allMonths = Array.from(monthSet).sort()
  const currentYm = thisYearMonth()

  // Show up to 12 months: prioritise current + future, pad with recent past if needed
  const futureMonths = allMonths.filter((m) => m >= currentYm)
  const pastMonths = allMonths.filter((m) => m < currentYm)
  const showMonths =
    futureMonths.length >= 3
      ? futureMonths.slice(0, 12)
      : [...pastMonths.slice(-(12 - futureMonths.length)), ...futureMonths]

  // Index claims: scopeName::yearMonth -> claim
  type ClaimCell = { thisMonthValue: number | null; claimedPct: number | null; remainingValue: number | null }
  const claimByKey = new Map<string, ClaimCell>()
  for (const c of claims) {
    claimByKey.set(`${c.scopeName}::${c.yearMonth}`, {
      thisMonthValue: c.thisMonthValue,
      claimedPct: c.claimedPct,
      remainingValue: c.remainingValue,
    })
  }

  // Column totals per month
  const monthTotals = new Map<string, number>()
  for (const m of showMonths) {
    let total = 0
    for (const s of scopes) {
      const c = claimByKey.get(`${s.scopeName}::${m}`)
      if (c?.thisMonthValue != null) {
        total += c.thisMonthValue
      } else if (c?.claimedPct != null && s.scopeValue != null) {
        total += c.claimedPct * s.scopeValue
      }
    }
    if (total > 0) monthTotals.set(m, total)
  }

  const contractScopes = scopes.filter((s) => !s.isVariation)
  const variationScopes = scopes.filter((s) => s.isVariation)
  const orderedScopes = [...contractScopes, ...variationScopes]

  return (
    <div className="overflow-x-auto rounded-xl border border-rule bg-ink/60">
      <table className="min-w-full text-xs">
        <thead className="border-b border-rule bg-ink">
          <tr>
            <th className="sticky left-0 z-10 min-w-[200px] bg-ink px-3 py-2 text-left font-semibold text-cream">
              Scope
            </th>
            <th className="px-3 py-2 text-right font-semibold text-cream whitespace-nowrap">
              Contract Value
            </th>
            <th className="px-3 py-2 text-right font-semibold text-cream whitespace-nowrap">
              Remaining
            </th>
            <th className="px-3 py-2 text-right font-semibold text-cream whitespace-nowrap">
              Claimed
            </th>
            {showMonths.map((m) => (
              <th
                key={m}
                className={`px-2 py-2 text-right font-semibold whitespace-nowrap ${
                  m === currentYm ? "bg-highlight/30 text-fg" : "text-muted"
                }`}
              >
                {formatYearMonthShort(m)}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {orderedScopes.map((s, i) => {
            const isFirstVariation = s.isVariation && (i === 0 || !orderedScopes[i - 1]?.isVariation)
            return (
              <React.Fragment key={s.scopeName}>
                {isFirstVariation && (
                  <tr className="border-t-2 border-rule">
                    <td
                      colSpan={4 + showMonths.length}
                      className="bg-ink/80 px-3 py-1 text-[10px] font-semibold uppercase tracking-widest text-muted"
                    >
                      Variations
                    </td>
                  </tr>
                )}
                <tr
                  className={`border-t border-rule/40 hover:bg-rule/10 ${s.isVariation ? "bg-rule/5" : ""}`}
                >
                  <td className="sticky left-0 z-10 bg-ink px-3 py-2 text-cream">
                    <div className="flex items-start gap-1.5">
                      {s.jobIndex ? (
                        <span className="mt-px shrink-0 rounded border border-rule px-1 py-px font-mono text-[10px] text-fg">
                          {s.jobIndex}
                        </span>
                      ) : null}
                      <span className="leading-snug">{s.scopeName}</span>
                    </div>
                  </td>
                  <td className="px-3 py-2 text-right text-cream tabular-nums">
                    {formatCurrency(s.scopeValue)}
                  </td>
                  <td className={`px-3 py-2 text-right tabular-nums ${(s.remainingValue ?? 0) > 0 ? "text-cream" : "text-muted"}`}>
                    {formatCurrency(s.remainingValue)}
                  </td>
                  <td className="px-3 py-2 text-right text-muted tabular-nums">
                    {formatPct(s.claimedPct)}
                  </td>
                  {showMonths.map((m) => {
                    const c = claimByKey.get(`${s.scopeName}::${m}`)
                    const dollarValue =
                      c?.thisMonthValue != null
                        ? c.thisMonthValue
                        : c?.claimedPct != null && s.scopeValue != null
                        ? c.claimedPct * s.scopeValue
                        : null
                    const isCurrent = m === currentYm
                    return (
                      <td
                        key={m}
                        className={`px-2 py-2 text-right tabular-nums ${
                          isCurrent ? "bg-highlight/20 text-cream font-medium" : "text-muted"
                        } ${dollarValue != null && dollarValue > 0 ? "" : "opacity-40"}`}
                        title={
                          c?.remainingValue != null
                            ? `Remaining after: ${formatCurrency(c.remainingValue)}`
                            : undefined
                        }
                      >
                        {dollarValue != null && dollarValue > 0 ? formatCurrency(dollarValue) : "-"}
                      </td>
                    )
                  })}
                </tr>
              </React.Fragment>
            )
          })}

          {/* Totals row */}
          <tr className="border-t-2 border-rule bg-ink font-semibold">
            <td className="sticky left-0 z-10 bg-ink px-3 py-2 text-cream">Monthly total</td>
            <td className="px-3 py-2 text-right text-cream tabular-nums">
              {formatCurrency(scopes.reduce((sum, s) => sum + (s.scopeValue ?? 0), 0))}
            </td>
            <td className="px-3 py-2 text-right text-cream tabular-nums">
              {formatCurrency(scopes.reduce((sum, s) => sum + (s.remainingValue ?? 0), 0))}
            </td>
            <td className="px-3 py-2" />
            {showMonths.map((m) => {
              const total = monthTotals.get(m)
              return (
                <td
                  key={m}
                  className={`px-2 py-2 text-right tabular-nums ${
                    m === currentYm
                      ? "bg-highlight/20 text-fg"
                      : total
                      ? "text-cream"
                      : "text-muted opacity-40"
                  }`}
                >
                  {total ? formatCurrency(total) : "-"}
                </td>
              )
            })}
          </tr>
        </tbody>
      </table>
    </div>
  )
}
