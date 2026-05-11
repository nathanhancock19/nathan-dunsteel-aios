import { NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { getNcrAnalytics } from "@/lib/drive/ncr-analytics"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

export async function GET() {
  const session = await auth()
  if (!session) return NextResponse.json({ error: "unauthorized" }, { status: 401 })
  if (!process.env.GOOGLE_NCR_FOLDER_ID) {
    return NextResponse.json({ error: "GOOGLE_NCR_FOLDER_ID not set" }, { status: 503 })
  }
  try {
    const data = await getNcrAnalytics()
    return NextResponse.json(data)
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : String(err) }, { status: 500 })
  }
}
