import { NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { addLineItem } from "@/lib/airtable/variations"
import { z } from "zod"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

const schema = z.object({
  description: z.string().min(1).max(500),
  quantity: z.number().positive(),
  unit: z.string().optional(),
  rate: z.number().positive(),
})

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth()
  if (!session) return NextResponse.json({ error: "unauthorized" }, { status: 401 })
  const body = await req.json().catch(() => null)
  const parsed = schema.safeParse(body)
  if (!parsed.success) return NextResponse.json({ error: "invalid", details: parsed.error.format() }, { status: 400 })
  const { id } = await params
  try {
    const item = await addLineItem(id, parsed.data)
    return NextResponse.json(item)
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : String(err) }, { status: 500 })
  }
}
