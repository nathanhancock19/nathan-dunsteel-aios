import { NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { listVariations } from "@/lib/airtable/variations"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

export async function GET(req: Request) {
  const session = await auth()
  if (!session) return NextResponse.json({ error: "unauthorized" }, { status: 401 })
  const url = new URL(req.url)
  const status = url.searchParams.get("status") ?? undefined
  try {
    const variations = await listVariations({ status, limit: 100 })
    return NextResponse.json({ variations })
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : String(err) }, { status: 500 })
  }
}
