import { getDeliveriesForCurrentWeek } from "@/lib/sheets/deliveries"
import { Card } from "@/components/ui/Card"
import { Truck } from "lucide-react"
import { sydneyTodayIso } from "@/lib/utils/today"
import { DeliveriesCarousel, NoDeliveries, type DeliverySlide } from "./DeliveriesCarousel"

/**
 * Pulls Mon-Sun delivery jobs for the configured primary project, flattens
 * them into a chronological slide list (today and beyond preferred, past
 * days fall to the back), and hands the rest to the client carousel.
 *
 * Server component so the data fetch happens at render time; the carousel
 * itself is client-side only because it needs index state and arrow
 * handlers.
 */
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

  const slides: DeliverySlide[] = []
  for (const day of days) {
    for (const job of day.jobs) {
      slides.push({
        date: day.date,
        dayName: day.dayName,
        monthLabel: day.monthLabel,
        project: job.project,
        details: job.details,
        truck: job.truck ?? null,
        time: job.time ?? null,
        pm: job.pm ?? null,
        status: job.status ?? null,
        signedDocket: job.signedDocket ?? null,
      })
    }
  }

  // Put today and future first, past last (today's week may include days
  // already passed by Mon-Sun view, e.g. Wednesday lookup still includes
  // Monday and Tuesday).
  slides.sort((a, b) => {
    const aFuture = a.date >= today
    const bFuture = b.date >= today
    if (aFuture && !bFuture) return -1
    if (!aFuture && bFuture) return 1
    return a.date.localeCompare(b.date)
  })

  if (slides.length === 0) {
    return (
      <Card title="Deliveries this week" subtitle="Mon-Sun" icon={Truck}>
        <NoDeliveries
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
      subtitle={pluraliseDeliveries(slides.length)}
      icon={Truck}
    >
      <DeliveriesCarousel slides={slides} todayIso={today} />
    </Card>
  )
}

function pluraliseDeliveries(n: number): string {
  return `${n} deliver${n === 1 ? "y" : "ies"}`
}
