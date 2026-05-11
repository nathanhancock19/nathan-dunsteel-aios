import { auth } from "@/lib/auth"
import { Suspense } from "react"
import { TodayBar } from "@/components/dashboard/TodayBar"
import { SiteActivityCard } from "@/components/dashboard/SiteActivityCard"
import { POApprovalsCard } from "@/components/dashboard/POApprovalsCard"
import { DiaryTodayCard } from "@/components/dashboard/DiaryTodayCard"
import { DeliveriesCard } from "@/components/dashboard/DeliveriesCard"
import { DefectsCard } from "@/components/dashboard/DefectsCard"
import { NotesCard } from "@/components/dashboard/NotesCard"
import { UninvoicedCard } from "@/components/dashboard/UninvoicedCard"
import { ClaimsSummaryCard } from "@/components/budget/ClaimsSummaryCard"
import { Card } from "@/components/dashboard/Card"
import { DashboardTabs } from "@/components/dashboard/DashboardTabs"
import { Inbox } from "@/components/inbox/Inbox"

export const dynamic = "force-dynamic"

export default async function DashboardPage() {
  const session = await auth()
  const name = session?.user?.name ?? "Nathan"

  const snapshot = (
    <div className="space-y-4">
      <Suspense fallback={<Skeleton title="Budget (claims)" />}>
        <ClaimsSummaryCard variant="compact" />
      </Suspense>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
        <Suspense fallback={<Skeleton title="Diary today" />}>
          <DiaryTodayCard />
        </Suspense>

        <Suspense fallback={<Skeleton title="Defects" />}>
          <DefectsCard />
        </Suspense>

        <Suspense fallback={<Skeleton title="High priority notes" />}>
          <NotesCard />
        </Suspense>

        <Suspense fallback={<Skeleton title="Today on site" />}>
          <SiteActivityCard />
        </Suspense>

        <Suspense fallback={<Skeleton title="Deliveries today" />}>
          <DeliveriesCard />
        </Suspense>

        <Suspense fallback={<Skeleton title="POs awaiting approval" />}>
          <POApprovalsCard />
        </Suspense>

        <Suspense fallback={<Skeleton title="Uninvoiced subcon" />}>
          <UninvoicedCard />
        </Suspense>
      </div>
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
