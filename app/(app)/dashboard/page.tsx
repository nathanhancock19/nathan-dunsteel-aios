import { auth } from "@/lib/auth"
import { Suspense } from "react"
import { TodayBar } from "@/components/dashboard/TodayBar"
import { SiteActivityCard } from "@/components/dashboard/SiteActivityCard"
import { POApprovalsCard } from "@/components/dashboard/POApprovalsCard"
import { SiteDiaryCard } from "@/components/dashboard/SiteDiaryCard"
import { DeliveriesCard } from "@/components/dashboard/DeliveriesCard"
import { Card } from "@/components/dashboard/Card"
import { DashboardTabs } from "@/components/dashboard/DashboardTabs"
import { Inbox } from "@/components/inbox/Inbox"

export const dynamic = "force-dynamic"

export default async function DashboardPage() {
  const session = await auth()
  const name = session?.user?.name ?? "Nathan"

  const snapshot = (
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

      <Suspense fallback={<Skeleton title="Recent site diary" />}>
        <SiteDiaryCard />
      </Suspense>
    </div>
  )

  return (
    <div>
      <TodayBar name={name} />
      <DashboardTabs inbox={<Inbox />} snapshot={snapshot} />
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
