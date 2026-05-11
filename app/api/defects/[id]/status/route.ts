import { NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { markDefectStatus } from "@/lib/notion/write"
import { logDecision } from "@/lib/decisions/log"
import { z } from "zod"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

const schema = z.object({
  status: z.string().min(1).max(50),
})

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth()
  if (!session) return NextResponse.json({ error: "unauthorized" }, { status: 401 })
  const body = await req.json().catch(() => null)
  const parsed = schema.safeParse(body)
  if (!parsed.success) return NextResponse.json({ error: "invalid", details: parsed.error.format() }, { status: 400 })
  const { id } = await params
  try {
    const result = await markDefectStatus({ pageId: id, status: parsed.data.status })
    if (!result.ok) return NextResponse.json({ error: result.error }, { status: 500 })
    await logDecision({
      actor: "nathan",
      category: "defect-status",
      body: { pageId: id, status: parsed.data.status },
      sourceId: id,
    } as Parameters<typeof logDecision>[0])
    return NextResponse.json({ ok: true })
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : String(err) }, { status: 500 })
  }
}
