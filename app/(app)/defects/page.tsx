"use client"

import { useEffect, useMemo, useState } from "react"
import type { Defect } from "@/lib/notion/defects"

function formatCurrency(n: number | null): string {
  if (n == null) return "-"
  return new Intl.NumberFormat("en-AU", {
    style: "currency",
    currency: "AUD",
    maximumFractionDigits: 0,
  }).format(n)
}

function formatDate(iso: string | null): string {
  if (!iso) return "-"
  const [y, m, d] = iso.split("-")
  return `${d}/${m}/${y?.slice(2)}`
}

const SEVERITY_COLORS: Record<string, string> = {
  Critical: "bg-red-500/20 text-red-300 border-red-500/30",
  High: "bg-orange-500/20 text-orange-300 border-orange-500/30",
  Medium: "bg-yellow-500/20 text-yellow-300 border-yellow-500/30",
  Low: "bg-rule/30 text-muted border-rule",
}

const STATUS_COLORS: Record<string, string> = {
  Rectified: "bg-emerald-500/20 text-emerald-300",
  "In Progress": "bg-yellow-500/20 text-yellow-300",
  Deferred: "bg-rule/30 text-muted",
  Identified: "bg-blue-500/20 text-blue-300",
}

function KpiCard({
  label,
  value,
  sub,
  accent = false,
}: {
  label: string
  value: string | number
  sub?: string
  accent?: boolean
}) {
  return (
    <div className={`rounded-xl border p-4 ${accent ? "border-amber-500/40 bg-amber-500/5" : "border-rule bg-ink/60"}`}>
      <p className="text-[10px] uppercase tracking-wider text-muted">{label}</p>
      <p className={`mt-1 text-2xl font-bold tracking-tight ${accent ? "text-amber-300" : "text-cream"}`}>{value}</p>
      {sub ? <p className="mt-0.5 text-xs text-muted">{sub}</p> : null}
    </div>
  )
}

export default function DefectsPage() {
  const [defects, setDefects] = useState<Defect[] | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [filter, setFilter] = useState<string>("All")
  const [sortCol, setSortCol] = useState<"date" | "severity" | "status" | "cost">("date")
  const [sortAsc, setSortAsc] = useState(false)

  useEffect(() => {
    fetch("/api/defects/list?limit=200")
      .then((r) => r.json())
      .then((d: unknown) => {
        const data = d as { defects?: Defect[] } | Defect[]
        setDefects(Array.isArray(data) ? data : (data as { defects?: Defect[] }).defects ?? [])
      })
      .catch((e: Error) => setError(e.message))
  }, [])

  const summary = useMemo(() => {
    if (!defects) return null
    const high = defects.filter((d) => d.severity === "High" || d.severity === "Critical").length
    const rectified = defects.filter((d) => d.status === "Rectified").length
    const costImpact = defects.reduce((s, d) => s + (d.costImpact ?? 0), 0)
    return { high, rectified, costImpact }
  }, [defects])

  const severities = useMemo(() => {
    if (!defects) return []
    return Array.from(new Set(defects.map((d) => d.severity).filter(Boolean))) as string[]
  }, [defects])

  const filtered = useMemo(() => {
    if (!defects) return []
    let rows = filter === "All" ? defects : defects.filter((d) => d.severity === filter)
    rows = [...rows].sort((a, b) => {
      let av: string | number = ""
      let bv: string | number = ""
      if (sortCol === "date") { av = a.identifiedDate ?? ""; bv = b.identifiedDate ?? "" }
      if (sortCol === "severity") { av = a.severity ?? ""; bv = b.severity ?? "" }
      if (sortCol === "status") { av = a.status ?? ""; bv = b.status ?? "" }
      if (sortCol === "cost") { av = a.costImpact ?? 0; bv = b.costImpact ?? 0 }
      if (typeof av === "number") return sortAsc ? av - (bv as number) : (bv as number) - av
      return sortAsc ? av.localeCompare(bv as string) : (bv as string).localeCompare(av)
    })
    return rows
  }, [defects, filter, sortCol, sortAsc])

  function toggleSort(col: typeof sortCol) {
    if (sortCol === col) setSortAsc((v) => !v)
    else { setSortCol(col); setSortAsc(true) }
  }

  if (error) {
    return (
      <section className="space-y-4">
        <h1 className="text-2xl font-semibold tracking-tight text-cream">Defects - 411</h1>
        <div className="rounded-xl border border-red-500/30 bg-red-500/10 p-4 text-sm text-red-300">{error}</div>
      </section>
    )
  }

  return (
    <section className="space-y-5">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-cream">Defects - Project 411</h1>
          <p className="mt-1 text-sm text-muted">Lane Cove (Airtrunk SYD2)</p>
        </div>
        {defects ? (
          <span className="rounded-lg border border-amber-500/40 bg-amber-500/10 px-3 py-1.5 text-2xl font-bold text-amber-300">
            {defects.length}
          </span>
        ) : null}
      </div>

      {!defects ? (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="h-20 animate-pulse rounded-xl bg-rule/20" />
          ))}
        </div>
      ) : (
        <>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            <KpiCard label="Total defects" value={defects.length} accent />
            <KpiCard label="High / Critical" value={summary?.high ?? 0} />
            <KpiCard
              label="Rectified"
              value={summary?.rectified ?? 0}
              sub={
                defects.length > 0
                  ? `${Math.round(((summary?.rectified ?? 0) / defects.length) * 100)}%`
                  : undefined
              }
            />
            <KpiCard label="Cost impact" value={formatCurrency(summary?.costImpact ?? null)} />
          </div>

          <div className="flex flex-wrap gap-2">
            <button
              onClick={() => setFilter("All")}
              className={`rounded-md border px-3 py-1.5 text-xs font-medium transition ${
                filter === "All"
                  ? "border-amber-500/40 bg-amber-500/10 text-amber-300"
                  : "border-rule bg-ink/40 text-muted hover:text-cream"
              }`}
            >
              All ({defects.length})
            </button>
            {severities.map((sev) => (
              <button
                key={sev}
                onClick={() => setFilter(sev)}
                className={`rounded-md border px-3 py-1.5 text-xs font-medium transition ${
                  filter === sev
                    ? "border-amber-500/40 bg-amber-500/10 text-amber-300"
                    : "border-rule bg-ink/40 text-muted hover:text-cream"
                }`}
              >
                {sev} ({defects.filter((d) => d.severity === sev).length})
              </button>
            ))}
          </div>

          <div className="overflow-x-auto rounded-xl border border-rule bg-ink/60">
            <table className="min-w-full text-xs">
              <thead className="border-b border-rule bg-ink">
                <tr>
                  <th className="px-3 py-2 text-left font-semibold text-cream">Title</th>
                  <th className="px-3 py-2 text-left font-semibold text-cream">Assembly</th>
                  <th
                    className="cursor-pointer px-3 py-2 text-left font-semibold text-cream hover:text-amber-300"
                    onClick={() => toggleSort("severity")}
                  >
                    Severity {sortCol === "severity" ? (sortAsc ? "↑" : "↓") : "↕"}
                  </th>
                  <th
                    className="cursor-pointer px-3 py-2 text-left font-semibold text-cream hover:text-amber-300"
                    onClick={() => toggleSort("status")}
                  >
                    Status {sortCol === "status" ? (sortAsc ? "↑" : "↓") : "↕"}
                  </th>
                  <th
                    className="cursor-pointer px-3 py-2 text-right font-semibold text-cream hover:text-amber-300"
                    onClick={() => toggleSort("cost")}
                  >
                    Cost {sortCol === "cost" ? (sortAsc ? "↑" : "↓") : "↕"}
                  </th>
                  <th
                    className="cursor-pointer px-3 py-2 text-left font-semibold text-cream hover:text-amber-300"
                    onClick={() => toggleSort("date")}
                  >
                    Date {sortCol === "date" ? (sortAsc ? "↑" : "↓") : "↕"}
                  </th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((d) => (
                  <tr key={d.id} className="border-t border-rule/40 hover:bg-rule/10">
                    <td className="px-3 py-2">
                      {d.url ? (
                        <a
                          href={d.url}
                          target="_blank"
                          rel="noreferrer"
                          className="font-medium text-cream hover:text-amber-300"
                        >
                          {d.title}
                        </a>
                      ) : (
                        <span className="font-medium text-cream">{d.title}</span>
                      )}
                      {d.description ? (
                        <p className="mt-0.5 line-clamp-1 text-muted">{d.description}</p>
                      ) : null}
                    </td>
                    <td className="px-3 py-2">
                      {d.assembly ? (
                        <span className="rounded border border-rule bg-rule/20 px-1.5 py-0.5 font-mono text-[10px] text-cream">
                          {d.assembly}
                        </span>
                      ) : (
                        <span className="text-muted">-</span>
                      )}
                    </td>
                    <td className="px-3 py-2">
                      {d.severity ? (
                        <span
                          className={`rounded border px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider ${SEVERITY_COLORS[d.severity] ?? "border-rule bg-rule/30 text-muted"}`}
                        >
                          {d.severity}
                        </span>
                      ) : (
                        <span className="text-muted">-</span>
                      )}
                    </td>
                    <td className="px-3 py-2">
                      {d.status ? (
                        <span
                          className={`rounded px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider ${STATUS_COLORS[d.status] ?? "bg-rule/30 text-muted"}`}
                        >
                          {d.status}
                        </span>
                      ) : (
                        <span className="text-muted">-</span>
                      )}
                    </td>
                    <td className="px-3 py-2 text-right text-cream">{formatCurrency(d.costImpact)}</td>
                    <td className="px-3 py-2 text-muted">{formatDate(d.identifiedDate)}</td>
                  </tr>
                ))}
                {filtered.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-3 py-6 text-center text-muted">
                      No defects match this filter.
                    </td>
                  </tr>
                ) : null}
              </tbody>
            </table>
          </div>
        </>
      )}
    </section>
  )
}
