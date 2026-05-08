import { requireSession } from "@/lib/guards"
import { getUpcomingDeliveries, createDelivery } from "@/lib/airtable/deliveries"
import { NextResponse } from "next/server"

export async function GET() {
  await requireSession()
  try {
    const deliveries = await getUpcomingDeliveries()
    return NextResponse.json(deliveries)
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : String(err) },
      { status: 500 },
    )
  }
}

export async function POST(request: Request) {
  await requireSession()
  try {
    const body = (await request.json()) as {
      projectIds?: string[]
      description?: string
      scheduledDate?: string
    }
    if (!body.description || !body.scheduledDate) {
      return NextResponse.json({ error: "description and scheduledDate are required" }, { status: 400 })
    }
    const delivery = await createDelivery({
      projectIds: body.projectIds ?? [],
      description: body.description,
      scheduledDate: body.scheduledDate,
    })
    return NextResponse.json(delivery, { status: 201 })
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : String(err) },
      { status: 500 },
    )
  }
}
