import { NextResponse } from "next/server"
import { getTodayDockets, getTodaySiteActivity } from "@/lib/airtable"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

export async function GET() {
  try {
    const [dockets, summary] = await Promise.all([
      getTodayDockets(),
      getTodaySiteActivity(),
    ])
    return NextResponse.json({ summary, dockets })
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : String(err) },
      { status: 500 },
    )
  }
}
