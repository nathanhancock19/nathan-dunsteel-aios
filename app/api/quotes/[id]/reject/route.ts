import { requireSession } from "@/lib/guards"
import { rejectQuote } from "@/lib/airtable/quotes"
import { notifyNathan } from "@/lib/telegram"
import { NextResponse } from "next/server"

export async function POST(
  request: Request,
  { params }: { params: { id: string } },
) {
  await requireSession()
  try {
    const body = (await request.json()) as { supplier?: string }
    const quote = await rejectQuote(params.id)
    await notifyNathan(`Quote rejected: ${body.supplier ?? params.id}`)
    return NextResponse.json(quote)
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : String(err) },
      { status: 500 },
    )
  }
}
