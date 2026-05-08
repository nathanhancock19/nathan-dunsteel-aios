import { requireSession } from "@/lib/guards"
import { changeColumnValue } from "@/lib/monday"
import { notifyNathan } from "@/lib/telegram"
import { NextResponse } from "next/server"

const JOB_SCOPE_COLUMN_ID = "multi_select6"
const COST_CODE_COLUMN_ID = "single_select"
const STATUS_COLUMN_ID = "status"

type Body = {
  name?: string
  jobScopeId?: number | null
  costCodeLabel?: string | null
}

/**
 * Approve a PO. Optionally allocate Job/Scope (multi_select6 dropdown) and
 * Cost Code (single_select status) before flipping status to Approved.
 *
 * Write formats per Monday API:
 *  - dropdown: { ids: [labelId] }
 *  - status:   { label: "102 Materials - cold rolled" }
 *
 * Allocation writes are sequential. If any of them fails the request returns
 * 500 and the caller should not assume the status was updated.
 */
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
    const body = (await request.json().catch(() => ({}))) as Body

    if (typeof body.jobScopeId === "number") {
      await changeColumnValue({
        boardId,
        itemId: params.id,
        columnId: JOB_SCOPE_COLUMN_ID,
        value: JSON.stringify({ ids: [body.jobScopeId] }),
      })
    }

    if (typeof body.costCodeLabel === "string" && body.costCodeLabel.length > 0) {
      await changeColumnValue({
        boardId,
        itemId: params.id,
        columnId: COST_CODE_COLUMN_ID,
        value: JSON.stringify({ label: body.costCodeLabel }),
      })
    }

    await changeColumnValue({
      boardId,
      itemId: params.id,
      columnId: STATUS_COLUMN_ID,
      value: JSON.stringify({ label: "Approved" }),
    })

    await notifyNathan(`PO approved: ${body.name ?? params.id}`)
    return NextResponse.json({ ok: true })
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : String(err) },
      { status: 500 },
    )
  }
}
