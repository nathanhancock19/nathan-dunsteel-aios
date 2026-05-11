import { NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { getGeneralNotes, getHighPriorityNotes } from "@/lib/notion/general-notes"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

export async function GET(req: Request) {
  const session = await auth()
  if (!session) return NextResponse.json({ error: "unauthorized" }, { status: 401 })
  const url = new URL(req.url)
  const project = url.searchParams.get("project") ?? process.env.AIOS_PRIMARY_PROJECT_NUMBER
  const category = url.searchParams.get("category") ?? undefined
  const priority = url.searchParams.get("priority") ?? undefined
  const status = url.searchParams.get("status") ?? undefined
  const high = url.searchParams.get("high") === "1"
  const limit = Number(url.searchParams.get("limit") ?? 50)
  try {
    const notes = high
      ? await getHighPriorityNotes(project ?? undefined)
      : await getGeneralNotes({ project: project ?? undefined, category, priority, status, limit })
    return NextResponse.json({ notes })
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : String(err) }, { status: 500 })
  }
}
