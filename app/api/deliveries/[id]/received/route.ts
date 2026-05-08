import { requireSession } from "@/lib/guards"
import { markReceived } from "@/lib/airtable/deliveries"
import { notifyNathan } from "@/lib/telegram"
import { NextResponse } from "next/server"

export async function POST(
  _request: Request,
  { params }: { params: { id: string } },
) {
  await requireSession()
  try {
    const delivery = await markReceived(params.id)
    await notifyNathan(
      `Delivery received: ${delivery.description} (${delivery.scheduledDate})`,
    )
    return NextResponse.json(delivery)
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : String(err) },
      { status: 500 },
    )
  }
}
