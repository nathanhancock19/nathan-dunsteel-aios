import { requireSession } from "@/lib/guards"
import { changeColumnValue } from "@/lib/monday"
import { notifyNathan } from "@/lib/telegram"
import { NextResponse } from "next/server"

export async function POST(
  request: Request,
  { params }: { params: { id: string } },
) {
  await requireSession()
  const boardId = process.env.MONDAY_PO_BOARD_ID
  if (!boardId) {
    return NextResponse.json({ error: "MONDAY_PO_BOARD_ID not set" }, { status: 503 })
  }
  try {
    const body = (await request.json()) as { name?: string; message?: string }
    await changeColumnValue({
      boardId,
      itemId: params.id,
      columnId: "status",
      value: JSON.stringify({ label: "Queried" }),
    })
    const note = body.message ? ` — ${body.message}` : ""
    await notifyNathan(
      `PO queried: ${body.name ?? params.id}${note}`,
    )
    return NextResponse.json({ ok: true })
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : String(err) },
      { status: 500 },
    )
  }
}
