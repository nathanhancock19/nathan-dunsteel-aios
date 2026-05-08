import { requireSession } from "@/lib/guards"
import { approveQuote } from "@/lib/airtable/quotes"
import { notifyNathan } from "@/lib/telegram"
import { NextResponse } from "next/server"

export async function POST(
  request: Request,
  { params }: { params: { id: string } },
) {
  await requireSession()
  try {
    const body = (await request.json()) as { supplier?: string; amount?: number }
    const quote = await approveQuote(params.id)
    const label = body.supplier
      ? `${body.supplier}${body.amount ? ` ($${body.amount.toLocaleString()})` : ""}`
      : params.id
    await notifyNathan(`Quote approved: ${label}`)
    return NextResponse.json(quote)
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : String(err) },
      { status: 500 },
    )
  }
}
