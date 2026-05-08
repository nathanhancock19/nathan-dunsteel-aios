import { auth } from "@/lib/auth"
import { Suspense } from "react"
import { TodayBar } from "@/components/dashboard/TodayBar"
import { SiteActivityCard } from "@/components/dashboard/SiteActivityCard"
import { POApprovalsCard } from "@/components/dashboard/POApprovalsCard"
import { SiteDiaryCard } from "@/components/dashboard/SiteDiaryCard"
import { Card, ConfigState } from "@/components/dashboard/Card"

export const dynamic = "force-dynamic"

export default async function DashboardPage() {
  const session = await auth()
  const name = session?.user?.name ?? "Nathan"

  return (
    <div>
      <TodayBar name={name} />

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
        <Suspense fallback={<Skeleton title="Today on site" />}>
          <SiteActivityCard />
        </Suspense>

        <Suspense fallback={<Skeleton title="Deliveries today" />}>
          <DeliveriesCard />
        </Suspense>

        <Suspense fallback={<Skeleton title="POs awaiting approval" />}>
          <POApprovalsCard />
        </Suspense>

        <Suspense fallback={<Skeleton title="Urgent flags" />}>
          <UrgentFlagsCard />
        </Suspense>

        <Suspense fallback={<Skeleton title="Recent site diary" />}>
          <SiteDiaryCard />
        </Suspense>
      </div>
    </div>
  )
}

function Skeleton({ title }: { title: string }) {
  return (
    <Card title={title}>
      <div className="h-12 animate-pulse rounded bg-neutral-800/60" />
    </Card>
  )
}

function DeliveriesCard() {
  // Deliveries widget needs the AIOS-owned Deliveries Airtable table, which
  // does not exist yet. Surface a clear placeholder until then.
  return (
    <Card title="Deliveries today">
      <ConfigState envVar="Airtable Deliveries table (Section 5 of spec)" />
    </Card>
  )
}

function UrgentFlagsCard() {
  // Urgent-flag source is not defined in the spec yet. Stub for now.
  return (
    <Card title="Urgent flags">
      <p className="text-sm text-neutral-500">No urgent flags. (Source TBD.)</p>
    </Card>
  )
}
