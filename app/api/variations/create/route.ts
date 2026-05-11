import { NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { createVariationDraft } from "@/lib/airtable/variations"
import { z } from "zod"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

const schema = z.object({
  variationNumber: z.string().min(1).max(20),
  title: z.string().min(1).max(200),
  projectId: z.string().min(1),
})

export async function POST(req: Request) {
  const session = await auth()
  if (!session) return NextResponse.json({ error: "unauthorized" }, { status: 401 })
  const body = await req.json().catch(() => null)
  const parsed = schema.safeParse(body)
  if (!parsed.success) return NextResponse.json({ error: "invalid", details: parsed.error.format() }, { status: 400 })
  try {
    const v = await createVariationDraft(parsed.data)
    return NextResponse.json(v)
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : String(err) }, { status: 500 })
  }
}
