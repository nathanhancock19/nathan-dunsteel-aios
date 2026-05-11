import { NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { addGeneralNote } from "@/lib/notion/write"
import { logDecision } from "@/lib/decisions/log"
import { z } from "zod"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

const schema = z.object({
  title: z.string().min(1).max(200),
  body: z.string().max(5000).optional(),
  category: z.string().optional(),
  priority: z.enum(["Low", "Medium", "High"]).optional(),
  project: z.string().optional(),
})

export async function POST(req: Request) {
  const session = await auth()
  if (!session) return NextResponse.json({ error: "unauthorized" }, { status: 401 })
  const body = await req.json().catch(() => null)
  const parsed = schema.safeParse(body)
  if (!parsed.success) return NextResponse.json({ error: "invalid", details: parsed.error.format() }, { status: 400 })
  try {
    const note = await addGeneralNote(parsed.data)
    await logDecision({
      actor: "nathan",
      category: "note",
      subject: parsed.data.project ?? null,
      body: { title: parsed.data.title, notionPageId: note.id },
      sourceId: note.id,
    } as Parameters<typeof logDecision>[0])
    return NextResponse.json(note)
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : String(err) }, { status: 500 })
  }
}
