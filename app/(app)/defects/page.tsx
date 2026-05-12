"use client"

import { useEffect, useMemo, useState } from "react"

const CATEGORY_ORDER = [
  "Cleat on Wrong Side",
  "Cleat in Wrong Location",
  "Cleat Upside Down / 180°",
  "Cleat Missing / Not Welded",
  "Holes Not Drilled / Incorrect",
  "Drawing / Design Error",
  "Other / Unknown",
] as const

type NcrRecord = {
  id: string
  date: string
  level: string
  assembly: string
  description: string
  category: string
  thumbnailLink?: string
  webViewLink?: string
}

type Analytics = {
  records: NcrRecord[]
  total: number
  byCategory: Array<{ name: string; count: number; color: string }>
  byLevel: Array<{ name: string; count: number }>
  topCategory: { name: string; count: number } | null
  topLevel: { name: string; count: number } | null
}

function formatDate(iso: string): string {
  const [y, m, d] = iso.split("-")
  if (!y || !m || !d) return iso
  return `${d}/${m}/${y.slice(2)}`
}

function KpiCard({ label, value, sub, accent = false }: { label: string; value: string | number; sub?: string; accent?: boolean }) {
  return (
    <div className={`rounded-xl border p-4 ${accent ? "border-amber-500/40 bg-amber-500/5" : "border-rule bg-ink/60"}`}>
      <p className="text-[10px] uppercase tracking-wider text-muted">{label}</p>
      <p className={`mt-1 text-2xl font-bold tracking-tight ${accent ? "text-amber-300" : "text-cream"}`}>{value}</p>
      {sub ? <p className="mt-0.5 text-xs text-muted">{sub}</p> : null}
    </div>
  )
}

export default function DefectsPage() {
  const [data, setData] = useState<Analytics | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [filter, setFilter] = useState<string>("All")
  const [search, setSearch] = useState("")

  useEffect(() => {
    fetch("/api/ncr/analytics")
      .then((r) => r.json())
      .then((d: unknown) => setData(d as Analytics))
      .catch((e: Error) => setError(e.message))
  }, [])

  const filtered = useMemo(() => {
    if (!data) return []
    let rows = filter === "All" ? data.records : data.records.filter((r) => r.category === filter)
    if (search.trim()) {
      const q = search.toLowerCase()
      rows = rows.filter((r) =>
        r.assembly.toLowerCase().includes(q) ||
        r.description.toLowerCase().includes(q) ||
        r.level.toLowerCase().includes(q)
      )
    }
    return rows
  }, [data, filter, search])

  if (error) {
    return (
      <section className="space-y-4">
        <h1 className="text-2xl font-semibold tracking-tight text-cream">NCR Defects - 411</h1>
        <div className="rounded-xl border border-red-500/30 bg-red-500/10 p-4 text-sm text-red-300">{error}</div>
      </section>
    )
  }

  const categories = CATEGORY_ORDER

  return (
    <section className="space-y-5">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-cream">NCR Defects - Project 411</h1>
          <p className="mt-1 text-sm text-muted">From WhatsApp captures in Google Drive. Lane Cove (Airtrunk SYD2).</p>
        </div>
        {data ? (
          <span className="rounded-lg border border-amber-500/40 bg-amber-500/10 px-3 py-1.5 text-2xl font-bold text-amber-300">
            {data.total}
          </span>
        ) : null}
      </div>

      {!data ? (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="h-20 animate-pulse rounded-xl bg-rule/20" />
          ))}
        </div>
      ) : (
        <>
          {/* KPI strip */}
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            <KpiCard label="Total NCRs" value={data.total} accent />
            <KpiCard
              label="Top category"
              value={data.topCategory?.count ?? 0}
              sub={data.topCategory?.name ?? "-"}
            />
            <KpiCard
              label="Worst level"
              value={data.topLevel?.name ?? "-"}
              sub={data.topLevel ? `${data.topLevel.count} NCRs` : undefined}
            />
            <KpiCard
              label="Categories"
              value={data.byCategory.length}
              sub="distinct defect types"
            />
          </div>

          {/* Category breakdown */}
          <div className="rounded-xl border border-rule bg-ink/60 p-4">
            <p className="mb-3 text-[10px] font-semibold uppercase tracking-wider text-muted">By Category</p>
            <div className="space-y-2">
              {data.byCategory.map((c) => (
                <div key={c.name} className="flex items-center gap-3">
                  <div className="w-48 shrink-0 text-xs text-cream">{c.name}</div>
                  <div className="flex flex-1 items-center gap-2">
                    <div
                      className="h-4 rounded"
                      style={{
                        width: `${Math.round((c.count / data.total) * 100)}%`,
                        backgroundColor: c.color,
                        minWidth: "8px",
                      }}
                    />
                    <span className="text-xs font-semibold text-cream">{c.count}</span>
                    <span className="text-[10px] text-muted">
                      {Math.round((c.count / data.total) * 100)}%
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Level breakdown */}
          {data.byLevel.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {data.byLevel.map((l) => (
                <div key={l.name} className="rounded-lg border border-rule bg-ink/40 px-3 py-2 text-center">
                  <p className="text-xs font-semibold text-cream">{l.name}</p>
                  <p className="text-[10px] text-muted">{l.count}</p>
                </div>
              ))}
            </div>
          )}

          {/* Filter + search */}
          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={() => setFilter("All")}
              className={`rounded-md border px-3 py-1.5 text-xs font-medium transition ${filter === "All" ? "border-amber-500/40 bg-amber-500/10 text-amber-300" : "border-rule bg-ink/40 text-muted hover:text-cream"}`}
            >
              All ({data.total})
            </button>
            {categories.filter((c) => data.byCategory.some((b) => b.name === c)).map((cat) => {
              const count = data.byCategory.find((b) => b.name === cat)?.count ?? 0
              return (
                <button
                  key={cat}
                  onClick={() => setFilter(cat)}
                  className={`rounded-md border px-3 py-1.5 text-xs font-medium transition ${filter === cat ? "border-amber-500/40 bg-amber-500/10 text-amber-300" : "border-rule bg-ink/40 text-muted hover:text-cream"}`}
                >
                  {cat.split(" ").slice(0, 2).join(" ")} ({count})
                </button>
              )
            })}
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search assembly, description..."
              className="ml-auto rounded-md border border-rule bg-ink/40 px-3 py-1.5 text-xs text-cream placeholder-muted focus:border-border-strong focus:outline-none"
            />
          </div>

          {/* Photo grid */}
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
            {filtered.map((r) => (
              <a
                key={r.id}
                href={r.webViewLink}
                target="_blank"
                rel="noreferrer"
                className="block rounded-xl border border-rule bg-ink/40 p-2 hover:border-border-strong"
              >
                {r.thumbnailLink ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={r.thumbnailLink}
                    alt={r.assembly}
                    className="aspect-square w-full rounded object-cover"
                  />
                ) : (
                  <div className="flex aspect-square items-center justify-center rounded bg-rule/30 text-[10px] text-muted">
                    no preview
                  </div>
                )}
                <div className="mt-2 space-y-0.5">
                  <div className="flex items-center justify-between gap-1">
                    <span className="rounded border border-rule bg-rule/20 px-1.5 py-px font-mono text-[10px] text-cream">
                      {r.assembly}
                    </span>
                    <span className="text-[10px] text-muted">{r.level}</span>
                  </div>
                  <p className="line-clamp-2 text-[10px] text-muted">{r.description}</p>
                  <p className="text-[9px] text-muted/60">{formatDate(r.date)}</p>
                </div>
              </a>
            ))}
            {filtered.length === 0 && (
              <div className="col-span-full py-8 text-center text-sm text-muted">
                No NCRs match this filter.
              </div>
            )}
          </div>
        </>
      )}
    </section>
  )
}
