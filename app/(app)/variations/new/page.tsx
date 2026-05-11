import { VariationWizard } from "@/components/variations/VariationWizard"

export const dynamic = "force-dynamic"

export default function NewVariationPage() {
  return (
    <section className="space-y-5">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight text-cream">New variation</h1>
        <p className="mt-1 text-sm text-muted">Three-step flow: details, line items, review and submit.</p>
      </div>
      <VariationWizard />
    </section>
  )
}
