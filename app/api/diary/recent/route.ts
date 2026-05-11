import { NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { getRecentDiaryEntries, getDiaryFlaggedEntries } from "@/lib/notion/diary"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

export async function GET(req: Request) {
  const session = await auth()
  if (!session) return NextResponse.json({ error: "unauthorized" }, { status: 401 })
  const url = new URL(req.url)
  const limit = Number(url.searchParams.get("limit") ?? 10)
  const flagged = url.searchParams.get("flagged") === "1"
  try {
    const entries = flagged
      ? await getDiaryFlaggedEntries({ days: Number(url.searchParams.get("days") ?? 7) })
      : await getRecentDiaryEntries(limit)
    return NextResponse.json({ entries })
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : String(err) }, { status: 500 })
  }
}
