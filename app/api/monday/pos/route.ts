import { requireSession } from "@/lib/guards"
import { listBoardItems } from "@/lib/monday"
import { NextResponse } from "next/server"

export async function GET() {
  await requireSession()
  const boardId = process.env.MONDAY_PO_BOARD_ID
  if (!boardId) {
    return NextResponse.json({ error: "MONDAY_PO_BOARD_ID not set" }, { status: 503 })
  }
  try {
    const items = await listBoardItems(boardId, 50)
    return NextResponse.json(items)
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : String(err) },
      { status: 500 },
    )
  }
}
