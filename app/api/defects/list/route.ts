import { NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { getDefectsList, getOpenHighSeverityDefects } from "@/lib/notion/defects"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

export async function GET(req: Request) {
  const session = await auth()
  if (!session) return NextResponse.json({ error: "unauthorized" }, { status: 401 })
  const url = new URL(req.url)
  const status = url.searchParams.get("status") ?? undefined
  const limit = Number(url.searchParams.get("limit") ?? 50)
  const open = url.searchParams.get("open") === "1"
  try {
    const defects = open
      ? await getOpenHighSeverityDefects()
      : await getDefectsList({ status, limit })
    return NextResponse.json({ defects })
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : String(err) }, { status: 500 })
  }
}
