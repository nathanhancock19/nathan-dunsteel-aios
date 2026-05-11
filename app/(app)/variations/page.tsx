import Link from "next/link"
import { listVariations } from "@/lib/airtable/variations"

export const dynamic = "force-dynamic"

function statusColor(s: string): string {
  if (s === "Approved") return "text-emerald-300"
  if (s === "Rejected") return "text-red-300"
  return "text-yellow-300"
}

function formatCurrency(n: number | null): string {
  if (n == null) return "-"
  return new Intl.NumberFormat("en-AU", { style: "currency", currency: "AUD", maximumFractionDigits: 0 }).format(n)
}

export default async function VariationsPage() {
  const project = process.env.AIOS_PRIMARY_PROJECT_NUMBER ?? "411"
  let variations: Awaited<ReturnType<typeof listVariations>> = []
  let error: string | null = null
  try {
    variations = await listVariations()
  } catch (err) {
    error = err instanceof Error ? err.message : String(err)
  }

  return (
    <section className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-cream">Project {project} Variations</h1>
          <p className="mt-1 text-sm text-muted">Variation submissions to AW Edwards.</p>
        </div>
        <Link
          href="/variations/new"
          className="rounded-md border border-border-strong bg-highlight px-3 py-2 text-sm font-medium text-fg hover:bg-highlight/60"
        >
          New variation
        </Link>
      </div>

      {error ? (
        <div className="rounded-xl border border-red-500/30 bg-red-500/10 p-4 text-sm">
          <p className="font-semibold text-red-300">Variations table not available</p>
          <p className="mt-1 text-xs text-muted">{error}</p>
          <p className="mt-2 text-xs text-muted">
            Create the Variations and VariationLineItems tables in Airtable base{" "}
            <code className="rounded bg-rule px-1">{process.env.AIRTABLE_BASE_ID}</code>. See spec Section 5.
          </p>
        </div>
      ) : variations.length === 0 ? (
        <p className="text-sm text-muted">No variations yet. Click &quot;New variation&quot; to start one.</p>
      ) : (
        <ul className="space-y-2">
          {variations.map((v) => (
            <li key={v.id}>
              <Link
                href={`/variations/${v.id}`}
                className="block rounded-lg border border-rule bg-ink/40 p-3 hover:border-border-strong"
              >
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium text-cream">
                      <span className="text-muted">{v.variationNumber}</span> {v.title}
                    </p>
                    {v.createdAt ? (
                      <p className="mt-0.5 text-xs text-muted">{new Date(v.createdAt).toLocaleDateString("en-AU")}</p>
                    ) : null}
                  </div>
                  <div className="text-right">
                    <p className="text-lg font-semibold text-cream">{formatCurrency(v.total)}</p>
                    <p className={`text-[10px] uppercase tracking-wider ${statusColor(v.status)}`}>{v.status}</p>
                  </div>
                </div>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </section>
  )
}
