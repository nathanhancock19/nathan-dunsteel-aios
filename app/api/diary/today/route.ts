import { NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { getDiaryEntriesForDate } from "@/lib/notion/diary"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

export async function GET(req: Request) {
  const session = await auth()
  if (!session) return NextResponse.json({ error: "unauthorized" }, { status: 401 })
  const url = new URL(req.url)
  const date = url.searchParams.get("date") ?? undefined
  try {
    const entries = await getDiaryEntriesForDate({ date })
    return NextResponse.json({ date: date ?? null, entries })
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : String(err) }, { status: 500 })
  }
}
