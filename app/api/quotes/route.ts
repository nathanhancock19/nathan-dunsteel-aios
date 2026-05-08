import { requireSession } from "@/lib/guards"
import { listPendingQuotes } from "@/lib/airtable/quotes"
import { NextResponse } from "next/server"

export async function GET() {
  await requireSession()
  try {
    const quotes = await listPendingQuotes()
    return NextResponse.json(quotes)
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : String(err) },
      { status: 500 },
    )
  }
}
