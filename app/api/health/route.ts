import { NextResponse } from "next/server"
import { pingAirtable } from "@/lib/airtable"
import { pingMonday } from "@/lib/monday"
import { pingNotion } from "@/lib/notion"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

export async function GET() {
  const [airtable, monday, notion] = await Promise.all([
    pingAirtable(),
    pingMonday(),
    pingNotion(),
  ])
  const allOk = airtable.ok && monday.ok && notion.ok
  return NextResponse.json(
    {
      status: allOk ? "ok" : "degraded",
      checks: { airtable, monday, notion },
      time: new Date().toISOString(),
    },
    { status: allOk ? 200 : 503 },
  )
}
