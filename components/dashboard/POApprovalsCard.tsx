import Link from "next/link"
import { listBoardItems, filterItemsByAssignee } from "@/lib/monday"
import { Card, ErrorState } from "./Card"

/**
 * POs awaiting Nathan's approval, mirroring the /approvals page filter:
 *   1. fetch all items on MONDAY_PO_BOARD_ID
 *   2. filter to items where `people` column contains AIOS_USER_MONDAY_ID
 *   3. count those with a "pending" status
 *
 * Without the assignee filter the count diverges from /approvals (which is
 * what confused Nathan: dashboard said 10 pending, page showed 4).
 *
 * Returns null (no card) when nothing is pending — no wasted grid slot.
 */
export async function POApprovalsCard() {
  if (!process.env.MONDAY_API_KEY || !process.env.MONDAY_PO_BOARD_ID) {
    return null
  }

  try {
    const all = await listBoardItems(process.env.MONDAY_PO_BOARD_ID, 50)
    const userIdRaw = process.env.AIOS_USER_MONDAY_ID
    const userId = userIdRaw ? Number(userIdRaw) : null
    const mine = filterItemsByAssignee(all, userId)
    const pending = mine.filter((i) => {
      const status = i.column_values.find((c) => c.id === "status")
      return status?.text?.toLowerCase().includes("pending")
    })
    if (pending.length === 0) {
      return null
    }
    const visible = pending.slice(0, 5)
    const overflow = pending.length - visible.length
    return (
      <Card title="POs awaiting approval" subtitle={`${pending.length} pending`}>
        <ul className="space-y-2 text-sm">
          {visible.map((item) => (
            <li key={item.id} className="text-cream">
              {item.name}
            </li>
          ))}
        </ul>
        {overflow > 0 && (
          <Link
            href="/approvals"
            className="mt-3 inline-block text-xs text-muted hover:text-cream"
          >
            View all {pending.length} pending →
          </Link>
        )}
      </Card>
    )
  } catch (err) {
    return (
      <Card title="POs awaiting approval">
        <ErrorState message={err instanceof Error ? err.message : String(err)} />
      </Card>
    )
  }
}
