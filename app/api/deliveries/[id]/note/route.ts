import { requireSession } from "@/lib/guards"
import { addNote } from "@/lib/airtable/deliveries"
import { NextResponse } from "next/server"

export async function POST(
  request: Request,
  { params }: { params: { id: string } },
) {
  await requireSession()
  try {
    const body = (await request.json()) as { note?: string }
    if (!body.note?.trim()) {
      return NextResponse.json({ error: "note is required" }, { status: 400 })
    }
    const note = await addNote(params.id, body.note.trim())
    return NextResponse.json(note, { status: 201 })
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : String(err) },
      { status: 500 },
    )
  }
}
