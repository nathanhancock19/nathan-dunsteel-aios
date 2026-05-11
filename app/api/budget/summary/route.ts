import { NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { getMerSummary, getMerSyncStatus } from "@/lib/strumis/queries"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

export async function GET() {
  const session = await auth()
  if (!session) return NextResponse.json({ error: "unauthorized" }, { status: 401 })
  try {
    const [summary, sync] = await Promise.all([getMerSummary(), getMerSyncStatus()])
    return NextResponse.json({ summary, sync })
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : String(err) },
      { status: 500 }
    )
  }
}
