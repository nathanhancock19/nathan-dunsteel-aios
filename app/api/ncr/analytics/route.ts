import { NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { getNcrAnalytics } from "@/lib/drive/ncr-analytics"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"
export const maxDuration = 30

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
    const raw = err instanceof Error ? err.message : String(err)
    // Drive returns "File not found" both when the folder ID is wrong AND when
    // the service account has no access. Add a hint either way.
    const hint = /file not found/i.test(raw)
      ? `Drive folder ${process.env.GOOGLE_NCR_FOLDER_ID} not reachable. Share it with the AIOS service account (Viewer) or check the folder ID.`
      : null
    return NextResponse.json({ error: hint ?? raw, raw }, { status: 500 })
  }
}
