import { NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { listNcrPhotos, getNcrSummary } from "@/lib/drive/ncr"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

export async function GET(req: Request) {
  const session = await auth()
  if (!session) return NextResponse.json({ error: "unauthorized" }, { status: 401 })
  const url = new URL(req.url)
  const summary = url.searchParams.get("summary") === "1"
  if (!process.env.GOOGLE_NCR_FOLDER_ID) {
    return NextResponse.json({ error: "GOOGLE_NCR_FOLDER_ID not set" }, { status: 503 })
  }
  try {
    if (summary) return NextResponse.json(await getNcrSummary())
    const limit = Number(url.searchParams.get("limit") ?? 100)
    const result = await listNcrPhotos({ limit })
    return NextResponse.json(result)
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : String(err) }, { status: 500 })
  }
}
