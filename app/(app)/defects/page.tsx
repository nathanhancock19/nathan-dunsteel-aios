import { Suspense } from "react"
import { getDefectsList, getDefectsSummary } from "@/lib/notion/defects"

export const dynamic = "force-dynamic"

function severityColor(s: string | null): string {
  if (!s) return "bg-rule/30 text-muted"
  if (s === "High" || s === "Critical") return "bg-red-500/20 text-red-300"
  if (s === "Medium") return "bg-yellow-500/20 text-yellow-300"
  return "bg-rule/30 text-muted"
}

function statusColor(s: string | null): string {
  if (!s) return "bg-rule/30 text-muted"
  if (s === "Rectified") return "bg-emerald-500/20 text-emerald-300"
  if (s === "In Progress") return "bg-yellow-500/20 text-yellow-300"
  if (s === "Deferred") return "bg-rule/40 text-muted"
  return "bg-blue-500/20 text-blue-300"
}

async function SummaryStrip() {
  const s = await getDefectsSummary()
  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
      {Object.entries(s.byStatus).map(([k, v]) => (
        <div key={k} className="rounded-xl border border-rule bg-ink/60 p-3">
          <p className="text-[10px] uppercase tracking-wider text-muted">{k}</p>
          <p className="mt-1 text-2xl font-semibold tracking-tight text-cream">{v}</p>
        </div>
      ))}
    </div>
  )
}

async function DefectsList() {
  const defects = await getDefectsList({ limit: 100 })
  if (defects.length === 0) return <p className="text-sm text-muted">No defects.</p>
  return (
    <ul className="space-y-2">
      {defects.map((d) => (
        <li key={d.id}>
          <a
            href={d.url}
            target="_blank"
            rel="noreferrer"
            className="block rounded-lg border border-rule bg-ink/40 p-3 text-sm hover:border-signal"
          >
            <div className="mb-1 flex items-center justify-between gap-2">
              <span className="font-medium text-cream">{d.title}</span>
              <div className="flex gap-1">
                {d.severity ? (
                  <span className={`rounded px-2 py-0.5 text-[10px] uppercase tracking-wider ${severityColor(d.severity)}`}>{d.severity}</span>
                ) : null}
                {d.status ? (
                  <span className={`rounded px-2 py-0.5 text-[10px] uppercase tracking-wider ${statusColor(d.status)}`}>{d.status}</span>
                ) : null}
              </div>
            </div>
            {d.description ? <p className="line-clamp-2 text-xs text-muted">{d.description}</p> : null}
            <div className="mt-2 flex flex-wrap items-center gap-3 text-[10px] uppercase tracking-wider text-muted">
              {d.assembly ? <span>{d.assembly}</span> : null}
              {d.location ? <span>{d.location}</span> : null}
              {d.identifiedDate ? <span>Identified {d.identifiedDate}</span> : null}
              {d.costImpact ? (
                <span className="text-cream">
                  ${new Intl.NumberFormat("en-AU", { maximumFractionDigits: 0 }).format(d.costImpact)}
                </span>
              ) : null}
            </div>
          </a>
        </li>
      ))}
    </ul>
  )
}

export default function DefectsPage() {
  const project = process.env.AIOS_PRIMARY_PROJECT_NUMBER ?? "411"
  return (
    <section className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight text-cream">Project {project} Defects</h1>
        <p className="mt-1 text-sm text-muted">Defects register from Notion.</p>
      </div>
      <Suspense fallback={<div className="h-20 animate-pulse rounded-xl bg-rule/20" />}>
        <SummaryStrip />
      </Suspense>
      <Suspense fallback={<div className="h-32 animate-pulse rounded-xl bg-rule/20" />}>
        <DefectsList />
      </Suspense>
    </section>
  )
}
