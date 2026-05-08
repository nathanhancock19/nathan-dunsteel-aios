import { getUpcomingDeliveries, type Delivery } from "@/lib/airtable/deliveries"
import { DeliveryList } from "@/components/deliveries/DeliveryList"
import Link from "next/link"

export const dynamic = "force-dynamic"

export default async function DeliveriesPage() {
  let deliveries: Delivery[] = []
  let error: string | null = null

  try {
    deliveries = await getUpcomingDeliveries()
  } catch (err) {
    error = err instanceof Error ? err.message : String(err)
    deliveries = []
  }

  const today = deliveries.filter((d) => {
    const todayISO = new Date().toISOString().slice(0, 10)
    return d.scheduledDate === todayISO
  })

  const upcoming = deliveries.filter((d) => {
    const todayISO = new Date().toISOString().slice(0, 10)
    return d.scheduledDate > todayISO
  })

  return (
    <div className="max-w-2xl">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-lg font-semibold text-neutral-100">Deliveries</h1>
          <p className="text-sm text-neutral-500">Today and next 7 days</p>
        </div>
        <Link
          href="/deliveries/new"
          className="rounded-md bg-orange-600 px-3 py-2 text-sm font-medium text-white hover:bg-orange-500"
        >
          Add delivery
        </Link>
      </div>

      {error && (
        <div className="mb-4 rounded-md border border-red-900 bg-red-950 px-4 py-3 text-sm text-red-300">
          {error}
        </div>
      )}

      {today.length > 0 && (
        <section className="mb-6">
          <h2 className="mb-3 text-xs font-semibold uppercase tracking-wider text-neutral-500">
            Today
          </h2>
          <DeliveryList initial={today} />
        </section>
      )}

      {upcoming.length > 0 && (
        <section>
          <h2 className="mb-3 text-xs font-semibold uppercase tracking-wider text-neutral-500">
            Upcoming
          </h2>
          <DeliveryList initial={upcoming} />
        </section>
      )}

      {deliveries.length === 0 && !error && (
        <p className="text-sm text-neutral-500">No deliveries in the next 7 days.</p>
      )}
    </div>
  )
}
