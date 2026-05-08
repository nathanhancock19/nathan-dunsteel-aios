import { requireSession } from "@/lib/guards"
import { markDelayed } from "@/lib/airtable/deliveries"
import { notifyNathan } from "@/lib/telegram"
import { NextResponse } from "next/server"

export async function POST(
  request: Request,
  { params }: { params: { id: string } },
) {
  await requireSession()
  try {
    const body = (await request.json()) as { reason?: string }
    const reason = body.reason?.trim() || "No reason provided"
    const delivery = await markDelayed(params.id, reason)
    await notifyNathan(
      `Delivery delayed: ${delivery.description} (${delivery.scheduledDate}). Reason: ${reason}`,
    )
    return NextResponse.json(delivery)
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : String(err) },
      { status: 500 },
    )
  }
}
