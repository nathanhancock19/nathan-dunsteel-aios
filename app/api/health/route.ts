import { NextResponse } from "next/server"
import { pingAirtable } from "@/lib/airtable"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

export async function GET() {
  const airtable = await pingAirtable()
  const allOk = airtable.ok
  return NextResponse.json(
    {
      status: allOk ? "ok" : "degraded",
      checks: {
        airtable,
      },
      time: new Date().toISOString(),
    },
    { status: allOk ? 200 : 503 },
  )
}
