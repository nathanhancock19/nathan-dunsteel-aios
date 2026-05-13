import Link from "next/link"
import { getDeliveriesForCurrentWeek } from "@/lib/sheets/deliveries"
import { Card } from "@/components/ui/Card"
import { EmptyState } from "@/components/ui/EmptyState"
import { Truck, CalendarDays } from "lucide-react"
import { sydneyTodayIso } from "@/lib/utils/today"

const WEEKDAY_SHORT = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"]

export async function DeliveriesCard() {
  const projectFilter = process.env.AIOS_PRIMARY_PROJECT_NUMBER
  const today = sydneyTodayIso()
  let days
  try {
    days = await getDeliveriesForCurrentWeek({ projectFilter })
  } catch (err) {
    return (
      <Card title="Deliveries this week" icon={Truck}>
        <p className="text-sm text-danger">
          <span className="font-semibold">Error:</span> {err instanceof Error ? err.message : String(err)}
        </p>
      </Card>
    )
  }

  const totalJobs = days.reduce((n, d) => n + d.jobs.length, 0)
  if (totalJobs === 0) {
    return (
      <Card title="Deliveries this week" subtitle="Mon-Sun" icon={Truck}>
        <EmptyState
          icon={CalendarDays}
          title="Nothing scheduled"
          description={
            projectFilter
              ? `No deliveries for project ${projectFilter} this week.`
              : "No deliveries this week."
          }
        />
      </Card>
    )
  }

  return (
    <Card
      title="Deliveries this week"
      subtitle={pluraliseDeliveries(totalJobs)}
      icon={Truck}
    >
      <div className="grid grid-cols-7 gap-1">
        {days.map((day, i) => {
          const count = day.jobs.length
          const isToday = day.date === today
          const dayShort = WEEKDAY_SHORT[i]
          const dayNum = day.date.slice(8)
          return (
            <Link
              key={day.date}
              href={`/deliveries?date=${day.date}`}
              className={`flex flex-col items-center rounded-md border px-1.5 py-2 text-center transition-colors ${
                isToday
                  ? "border-cream bg-cream/10"
                  : count > 0
                    ? "border-rule bg-surface-2 hover:bg-highlight"
                    : "border-rule/40 bg-transparent text-fg-subtle hover:bg-surface-2"
              }`}
              title={count === 0 ? "No deliveries" : pluraliseDeliveries(count)}
            >
              <span className="text-[10px] font-semibold uppercase tracking-wider text-fg-subtle">
                {dayShort}
              </span>
              <span className={`mono-nums text-base font-semibold ${isToday ? "text-cream" : "text-fg"}`}>
                {dayNum}
              </span>
              <span
                className={`mt-0.5 mono-nums text-[10px] ${
                  count > 0 ? "text-cream" : "text-fg-subtle"
                }`}
              >
                {count > 0 ? `${count}` : "—"}
              </span>
            </Link>
          )
        })}
      </div>
    </Card>
  )
}

function pluraliseDeliveries(n: number): string {
  return `${n} deliver${n === 1 ? "y" : "ies"}`
}
