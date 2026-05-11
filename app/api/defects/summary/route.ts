import { NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { getDefectsSummary } from "@/lib/notion/defects"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

export async function GET() {
  const session = await auth()
  if (!session) return NextResponse.json({ error: "unauthorized" }, { status: 401 })
  try {
    const summary = await getDefectsSummary()
    return NextResponse.json(summary)
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : String(err) }, { status: 500 })
  }
}
