import { auth } from "@/lib/auth"
import { Suspense } from "react"
import { TodayBar } from "@/components/dashboard/TodayBar"
import { SiteActivityCard } from "@/components/dashboard/SiteActivityCard"
import { POApprovalsCard } from "@/components/dashboard/POApprovalsCard"
import { DiaryTodayCard } from "@/components/dashboard/DiaryTodayCard"
import { DeliveriesCard } from "@/components/dashboard/DeliveriesCard"
import { DefectsCard } from "@/components/dashboard/DefectsCard"
import { NotesCard } from "@/components/dashboard/NotesCard"
import { OutlookCard } from "@/components/dashboard/OutlookCard"
import { ClaimsSummaryCard } from "@/components/budget/ClaimsSummaryCard"
import { CardSkeleton } from "@/components/ui/Skeleton"
import { DashboardTabs } from "@/components/dashboard/DashboardTabs"
import { Inbox } from "@/components/inbox/Inbox"

export const dynamic = "force-dynamic"

export default async function DashboardPage() {
  const session = await auth()
  const name = session?.user?.name ?? "Nathan"

  const snapshot = (
    <div className="space-y-4">
      <Suspense fallback={<CardSkeleton rows={2} />}>
        <ClaimsSummaryCard variant="compact" />
      </Suspense>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
        <Suspense fallback={<CardSkeleton />}>
          <DiaryTodayCard />
        </Suspense>

        <Suspense fallback={<CardSkeleton />}>
          <DefectsCard />
        </Suspense>

        <Suspense fallback={<CardSkeleton />}>
          <NotesCard />
        </Suspense>

        <Suspense fallback={<CardSkeleton />}>
          <SiteActivityCard />
        </Suspense>

        <Suspense fallback={<CardSkeleton />}>
          <DeliveriesCard />
        </Suspense>

        <Suspense fallback={<CardSkeleton />}>
          <POApprovalsCard />
        </Suspense>

        <Suspense fallback={<CardSkeleton />}>
          <OutlookCard />
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
