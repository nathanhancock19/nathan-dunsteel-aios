import {
  listBoardItems,
  getColumnOptions,
  filterItemsByAssignee,
  type MondayBoardItem,
  type ColumnOption,
} from "@/lib/monday"
import { suggestPOAllocation } from "@/lib/decisions/log"
import { POList, type AllocationSuggestion } from "@/components/approvals/POList"

export const dynamic = "force-dynamic"

const JOB_SCOPE_COLUMN_ID = "multi_select6"
const COST_CODE_COLUMN_ID = "single_select"

async function getPOs() {
  const boardId = process.env.MONDAY_PO_BOARD_ID
  if (!boardId) return null
  return listBoardItems(boardId, 50)
}

export default async function ApprovalsPage() {
  let pos: MondayBoardItem[] | null = null
  let posError: string | null = null
  let jobScopeOptions: ColumnOption[] = []
  let costCodeOptions: ColumnOption[] = []

  if (!process.env.MONDAY_API_KEY || !process.env.MONDAY_PO_BOARD_ID) {
    posError = "Monday.com not connected. Set MONDAY_API_KEY and MONDAY_PO_BOARD_ID in Vercel."
  } else {
    try {
      const all = await getPOs()
      const userIdRaw = process.env.AIOS_USER_MONDAY_ID
      const userId = userIdRaw ? Number(userIdRaw) : null
      pos = all === null ? null : filterItemsByAssignee(all, userId)
    } catch (err) {
      posError = err instanceof Error ? err.message : String(err)
    }

    try {
      const opts = await getColumnOptions(process.env.MONDAY_PO_BOARD_ID, [
        JOB_SCOPE_COLUMN_ID,
        COST_CODE_COLUMN_ID,
      ])
      jobScopeOptions = opts[JOB_SCOPE_COLUMN_ID] ?? []
      costCodeOptions = opts[COST_CODE_COLUMN_ID] ?? []
    } catch {
      // Non-critical: missing options disables allocation pickers only
    }
  }

  let suggestions: Record<string, AllocationSuggestion> = {}
  if (pos && pos.length > 0) {
    const pairs = await Promise.all(
      pos.map(async (i) => {
        const s = await suggestPOAllocation(i.name).catch(() => null)
        return [i.id, s] as const
      }),
    )
    suggestions = Object.fromEntries(
      pairs.filter(([, s]) => s !== null) as Array<[string, AllocationSuggestion]>,
    )
  }

  const pendingCount = pos?.filter((i) => {
    const status = i.column_values.find((c) => c.id === "status")?.text ?? ""
    return status.toLowerCase().includes("pending")
  }).length ?? 0

  return (
    <section className="space-y-5">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight text-cream">Approvals</h1>
        <p className="mt-1 text-sm text-muted">
          PO approvals from Monday.com
          {pendingCount > 0 ? ` - ${pendingCount} pending` : ""}
        </p>
      </div>

      {posError ? (
        <div className="rounded-xl border border-rule bg-ink/40 p-4 text-sm text-muted">
          {posError}
        </div>
      ) : pos ? (
        <POList
          items={pos}
          jobScopeOptions={jobScopeOptions}
          costCodeOptions={costCodeOptions}
          suggestions={suggestions}
        />
      ) : null}
    </section>
  )
}
