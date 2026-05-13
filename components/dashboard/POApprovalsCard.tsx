import Link from "next/link"
import { listBoardItems } from "@/lib/monday"
import { Card, ConfigState, EmptyState, ErrorState } from "./Card"

export async function POApprovalsCard() {
  if (!process.env.MONDAY_API_KEY) {
    return (
      <Card title="POs awaiting approval">
        <ConfigState envVar="MONDAY_API_KEY" />
      </Card>
    )
  }
  if (!process.env.MONDAY_PO_BOARD_ID) {
    return (
      <Card title="POs awaiting approval">
        <ConfigState envVar="MONDAY_PO_BOARD_ID" />
      </Card>
    )
  }

  try {
    const items = await listBoardItems(process.env.MONDAY_PO_BOARD_ID, 10)
    const pending = items.filter((i) => {
      const status = i.column_values.find((c) => c.id === "status")
      return status?.text?.toLowerCase().includes("pending")
    })
    if (pending.length === 0) {
      return (
        <Card title="POs awaiting approval">
          <EmptyState>Nothing waiting on you.</EmptyState>
        </Card>
      )
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
