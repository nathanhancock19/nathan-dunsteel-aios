import { Suspense } from "react"
import { ClaimsSummaryCard } from "@/components/budget/ClaimsSummaryCard"
import { ClaimsScheduleTable } from "@/components/budget/ClaimsScheduleTable"
import { MerSyncStatus } from "@/components/budget/MerSyncStatus"

export const dynamic = "force-dynamic"

export default function BudgetPage() {
  const project = process.env.AIOS_PRIMARY_PROJECT_NUMBER ?? "411"
  return (
    <section className="space-y-5">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight text-cream">Project {project} Budget</h1>
        <p className="mt-1 text-sm text-muted">
          Claims and revenue from the MER. Cost-side data lands when Strumis access is approved.
        </p>
      </div>

      <Suspense fallback={<div className="h-12 animate-pulse rounded-xl bg-rule/20" />}>
        <MerSyncStatus />
      </Suspense>

      <Suspense fallback={<div className="h-32 animate-pulse rounded-xl bg-rule/20" />}>
        <ClaimsSummaryCard variant="full" />
      </Suspense>

      <div>
        <h2 className="mb-2 text-sm font-semibold uppercase tracking-wider text-muted">Claims schedule</h2>
        <Suspense fallback={<div className="h-64 animate-pulse rounded-xl bg-rule/20" />}>
          <ClaimsScheduleTable />
        </Suspense>
      </div>
    </section>
  )
}
