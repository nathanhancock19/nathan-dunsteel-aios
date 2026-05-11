"use client"

import {
  PieChart,
  Pie,
  Cell,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  LineChart,
  Line,
} from "recharts"
import type { NcrCategory, NcrRecord } from "@/lib/drive/ncr-analytics"
import { Card } from "@/components/ui/Card"
import { Pill } from "@/components/ui/Pill"
import { Camera, AlertTriangle, Layers, Hash } from "lucide-react"

type AnalyticsData = {
  records: NcrRecord[]
  total: number
  byCategory: Array<{ name: NcrCategory; count: number; color: string }>
  byLevel: Array<{ name: string; count: number }>
  byDay: Array<{ date: string; count: number }>
  topCategory: { name: NcrCategory; count: number } | null
  topLevel: { name: string; count: number } | null
}

export function NcrDashboardCharts({ data }: { data: AnalyticsData }) {
  const total = data.total

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <KpiCard label="Total NCRs" value={data.total} icon={Camera} />
        <KpiCard
          label="Most common"
          value={data.topCategory?.name ?? "-"}
          sub={data.topCategory ? `${data.topCategory.count} of ${total} (${pct(data.topCategory.count, total)}%)` : undefined}
          icon={AlertTriangle}
          small
        />
        <KpiCard
          label="Top level"
          value={data.topLevel?.name ?? "-"}
          sub={data.topLevel ? `${data.topLevel.count} of ${total} (${pct(data.topLevel.count, total)}%)` : undefined}
          icon={Layers}
        />
        <KpiCard
          label="Cleat-related"
          value={data.byCategory.filter((c) => c.name.startsWith("Cleat")).reduce((s, c) => s + c.count, 0)}
          sub={`${pct(
            data.byCategory.filter((c) => c.name.startsWith("Cleat")).reduce((s, c) => s + c.count, 0),
            total,
          )}% of all NCRs`}
          icon={Hash}
        />
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <Card title="Defect types" icon={AlertTriangle}>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={data.byCategory}
                  dataKey="count"
                  nameKey="name"
                  innerRadius={50}
                  outerRadius={86}
                  strokeWidth={1}
                  stroke="var(--surface)"
                >
                  {data.byCategory.map((c, i) => (
                    <Cell key={i} fill={c.color} />
                  ))}
                </Pie>
                <Tooltip
                  contentStyle={tooltipStyle()}
                  formatter={(value, name) => [`${value} NCRs (${pct(Number(value), total)}%)`, String(name)] as [string, string]}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>
          <ul className="mt-3 grid grid-cols-1 gap-1 sm:grid-cols-2">
            {data.byCategory.map((c) => (
              <li key={c.name} className="flex items-center gap-2 text-xs">
                <span className="h-2.5 w-2.5 shrink-0 rounded-sm" style={{ background: c.color }} />
                <span className="text-fg">{c.count}</span>
                <span className="truncate text-fg-muted">{c.name}</span>
                <span className="ml-auto text-fg-subtle">{pct(c.count, total)}%</span>
              </li>
            ))}
          </ul>
        </Card>

        <Card title="NCRs by level / zone" icon={Layers}>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={data.byLevel}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
                <XAxis dataKey="name" stroke="var(--fg-muted)" tick={{ fontSize: 11 }} />
                <YAxis stroke="var(--fg-muted)" tick={{ fontSize: 11 }} allowDecimals={false} />
                <Tooltip contentStyle={tooltipStyle()} />
                <Bar dataKey="count" fill="var(--steel-800)" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Card>
      </div>

      <Card title="Daily NCR volume" subtitle={`${data.byDay[0]?.date ?? "?"} → ${data.byDay[data.byDay.length - 1]?.date ?? "?"}`} icon={AlertTriangle}>
        <div className="h-56">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={data.byDay}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
              <XAxis dataKey="date" stroke="var(--fg-muted)" tick={{ fontSize: 10 }} />
              <YAxis stroke="var(--fg-muted)" tick={{ fontSize: 11 }} allowDecimals={false} />
              <Tooltip contentStyle={tooltipStyle()} />
              <Line type="monotone" dataKey="count" stroke="var(--steel-800)" strokeWidth={2} dot={{ r: 3, fill: "var(--steel-800)" }} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </Card>
    </div>
  )
}

function KpiCard({
  label,
  value,
  sub,
  icon: Icon,
  small,
}: {
  label: string
  value: string | number
  sub?: string
  icon: typeof Camera
  small?: boolean
}) {
  return (
    <div className="rounded-lg border border-border bg-surface p-4">
      <div className="flex items-center justify-between">
        <p className="text-[10px] font-semibold uppercase tracking-wider text-fg-subtle">{label}</p>
        <Icon className="h-3.5 w-3.5 text-fg-subtle" />
      </div>
      <p className={`mt-2 font-semibold tracking-tight text-fg ${small ? "text-sm leading-tight" : "text-2xl tabular-nums"}`}>{value}</p>
      {sub ? <p className="mt-1 text-[11px] text-fg-muted">{sub}</p> : null}
    </div>
  )
}

function tooltipStyle() {
  return {
    background: "var(--surface)",
    border: "1px solid var(--border)",
    borderRadius: 6,
    fontSize: 12,
    color: "var(--fg)",
  }
}

function pct(n: number, total: number): number {
  if (!total) return 0
  return Math.round((n / total) * 100)
}

export function NcrRecordsTable({ records }: { records: NcrRecord[] }) {
  return (
    <Card title={`Full NCR log (${records.length} records)`}>
      <div className="overflow-x-auto">
        <table className="w-full min-w-[640px] text-xs">
          <thead>
            <tr className="border-b border-border text-left text-fg-subtle">
              <th className="px-2 py-2 font-semibold">#</th>
              <th className="px-2 py-2 font-semibold">Date</th>
              <th className="px-2 py-2 font-semibold">Level</th>
              <th className="px-2 py-2 font-semibold">Assembly</th>
              <th className="px-2 py-2 font-semibold">Description</th>
              <th className="px-2 py-2 font-semibold">Category</th>
              <th className="px-2 py-2 font-semibold">Photo</th>
            </tr>
          </thead>
          <tbody>
            {records.map((r, i) => (
              <tr key={r.id} className="border-b border-border/50 last:border-b-0 hover:bg-surface-2">
                <td className="px-2 py-1.5 text-fg-subtle">{i + 1}</td>
                <td className="px-2 py-1.5 text-fg-muted">{r.date}</td>
                <td className="px-2 py-1.5">
                  <Pill tone="muted" size="xs">{r.level}</Pill>
                </td>
                <td className="px-2 py-1.5 font-mono text-fg">{r.assembly}</td>
                <td className="px-2 py-1.5 text-fg-muted">{r.description}</td>
                <td className="px-2 py-1.5">
                  <Pill tone="muted" size="xs">{r.category}</Pill>
                </td>
                <td className="px-2 py-1.5">
                  {r.webViewLink ? (
                    <a href={r.webViewLink} target="_blank" rel="noreferrer" className="text-fg underline-offset-2 hover:underline">
                      View
                    </a>
                  ) : (
                    <span className="text-fg-subtle">-</span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </Card>
  )
}
