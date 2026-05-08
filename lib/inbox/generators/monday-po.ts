/**
 * Inbox generator: pending POs assigned to Nathan.
 *
 * Reads the same Monday board as the Approvals page, filtered by
 * AIOS_USER_MONDAY_ID. Emits one inbox item per PO with status that
 * contains "pending".
 *
 * Idempotency: a PO that gets approved or reassigned in Monday between
 * generator runs simply stops appearing here.
 */

import { listBoardItems, type MondayBoardItem } from "@/lib/monday"
import type { InboxItem } from "../types"

const ASSIGNEE_COLUMN_ID = "people"

function isAssignedTo(item: MondayBoardItem, userId: number): boolean {
  const raw = item.column_values.find((c) => c.id === ASSIGNEE_COLUMN_ID)?.value
  if (!raw) return false
  try {
    const parsed = JSON.parse(raw) as {
      personsAndTeams?: Array<{ id: number; kind: string }>
    }
    return parsed.personsAndTeams?.some((p) => p.id === userId) ?? false
  } catch {
    return false
  }
}

function col(item: MondayBoardItem, id: string): string {
  return item.column_values.find((c) => c.id === id)?.text ?? ""
}

export async function generateMondayPOItems(): Promise<InboxItem[]> {
  const boardId = process.env.MONDAY_PO_BOARD_ID
  if (!boardId) return []
  const userIdRaw = process.env.AIOS_USER_MONDAY_ID
  const userId = userIdRaw ? Number(userIdRaw) : null

  let items: MondayBoardItem[]
  try {
    items = await listBoardItems(boardId, 50)
  } catch {
    return []
  }

  const filtered = userId === null ? items : items.filter((i) => isAssignedTo(i, userId))

  const pending = filtered.filter((i) => {
    const status = col(i, "status")
    return status.toLowerCase().includes("pending")
  })

  return pending.map((i) => {
    const date = col(i, "date__1")
    const jobScope = col(i, "multi_select6")
    const costCode = col(i, "single_select")
    const contextParts: string[] = []
    if (date) contextParts.push(`Inv ${date}`)
    if (jobScope) contextParts.push(jobScope)
    if (costCode) contextParts.push(costCode)
    if (contextParts.length === 0) contextParts.push("Awaiting allocation")

    return {
      id: `monday-po:${i.id}`,
      source: "monday-po",
      urgency: "now",
      title: i.name,
      context: contextParts.join(" · "),
      createdAt: i.created_at,
      actions: [
        { label: "Review", href: "/approvals", variant: "primary" },
      ],
      raw: { itemId: i.id },
    }
  })
}
