import { listBoardItems } from "@/lib/monday"
import { POList } from "@/components/approvals/POList"

export const dynamic = "force-dynamic"

async function getPOs() {
  const boardId = process.env.MONDAY_PO_BOARD_ID
  if (!boardId) return null
  return listBoardItems(boardId, 50)
}

export default async function ApprovalsPage() {
  let pos
  let posError: string | null = null

  if (!process.env.MONDAY_API_KEY || !process.env.MONDAY_PO_BOARD_ID) {
    posError = "MONDAY_API_KEY or MONDAY_PO_BOARD_ID not set"
  } else {
    try {
      pos = await getPOs()
    } catch (err) {
      posError = err instanceof Error ? err.message : String(err)
    }
  }

  const pendingCount = pos?.filter((i) => {
    const status = i.column_values.find((c) => c.id === "status")?.text ?? ""
    return status.toLowerCase().includes("pending")
  }).length ?? 0

  return (
    <div className="max-w-2xl">
      <div className="mb-6">
        <h1 className="text-lg font-semibold text-neutral-100">Approvals</h1>
        {pendingCount > 0 && (
          <p className="text-sm text-orange-400">{pendingCount} PO{pendingCount !== 1 ? "s" : ""} waiting on you</p>
        )}
      </div>

      <section>
        <h2 className="mb-3 text-xs font-semibold uppercase tracking-wider text-neutral-500">
          PO Approvals
        </h2>

        {posError ? (
          <div className="rounded-md border border-red-900 bg-red-950 px-4 py-3 text-sm text-red-300">
            {posError}
          </div>
        ) : pos ? (
          <POList items={pos} />
        ) : (
          <p className="text-sm text-neutral-500">Loading...</p>
        )}
      </section>
    </div>
  )
}
