import { getVariation } from "@/lib/airtable/variations"
import Link from "next/link"

export const dynamic = "force-dynamic"

function formatCurrency(n: number | null | undefined): string {
  if (n == null) return "-"
  return new Intl.NumberFormat("en-AU", { style: "currency", currency: "AUD", maximumFractionDigits: 0 }).format(n)
}

export default async function VariationDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  let data: Awaited<ReturnType<typeof getVariation>> | null = null
  let error: string | null = null
  try {
    data = await getVariation(id)
  } catch (err) {
    error = err instanceof Error ? err.message : String(err)
  }

  if (error) {
    return (
      <section className="space-y-4">
        <div className="rounded-xl border border-red-500/30 bg-red-500/10 p-4 text-sm">
          <p className="font-semibold text-red-300">Could not load variation</p>
          <p className="mt-1 text-xs text-muted">{error}</p>
        </div>
      </section>
    )
  }

  const v = data!.variation
  const total = data!.lineItems.reduce((s, l) => s + l.total, 0)

  return (
    <section className="space-y-5">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-xs uppercase tracking-wider text-muted">{v.variationNumber} - {v.status}</p>
          <h1 className="mt-1 text-2xl font-semibold tracking-tight text-cream">{v.title}</h1>
        </div>
        <Link href="/variations" className="text-xs text-muted hover:text-fg">
          Back to list
        </Link>
      </div>

      <div className="rounded-xl border border-rule bg-ink/40 p-4">
        <table className="w-full text-sm">
          <thead className="border-b border-rule text-xs uppercase tracking-wider text-muted">
            <tr>
              <th className="py-2 text-left">Description</th>
              <th className="py-2 text-right">Qty</th>
              <th className="py-2 text-right">Unit</th>
              <th className="py-2 text-right">Rate</th>
              <th className="py-2 text-right">Total</th>
            </tr>
          </thead>
          <tbody>
            {data!.lineItems.map((l) => (
              <tr key={l.id} className="border-b border-rule/30">
                <td className="py-2 text-cream">{l.description}</td>
                <td className="py-2 text-right">{l.quantity}</td>
                <td className="py-2 text-right text-muted">{l.unit ?? "-"}</td>
                <td className="py-2 text-right">{formatCurrency(l.rate)}</td>
                <td className="py-2 text-right text-cream">{formatCurrency(l.total)}</td>
              </tr>
            ))}
            <tr>
              <td colSpan={4} className="pt-3 text-right text-muted">Total</td>
              <td className="pt-3 text-right text-base font-semibold text-cream">{formatCurrency(total)}</td>
            </tr>
          </tbody>
        </table>
      </div>

      <p className="text-xs text-muted">
        PDF export available in next iteration. Status updates and approve/reject coming with the Activity Log linkage.
      </p>
    </section>
  )
}
