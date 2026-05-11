import { getNcrAnalytics } from "@/lib/drive/ncr-analytics"
import { NcrDashboardCharts, NcrRecordsTable } from "@/components/defects/NcrDashboard"
import Link from "next/link"

export const dynamic = "force-dynamic"

export default async function NcrDashboardPage() {
  if (!process.env.GOOGLE_NCR_FOLDER_ID) {
    return (
      <section className="space-y-4">
        <header>
          <p className="text-xs uppercase tracking-wider text-fg-subtle">Project 411 / NCR analytics</p>
          <h1 className="mt-1 text-2xl font-semibold tracking-tight text-fg">NCR Dashboard</h1>
        </header>
        <div className="rounded-xl border border-border bg-surface-2 p-4 text-sm">
          <p className="text-fg">
            Set <code className="rounded bg-surface-3 px-1 py-0.5 text-xs">GOOGLE_NCR_FOLDER_ID</code> to enable. Service account{" "}
            <code className="rounded bg-surface-3 px-1 py-0.5 text-xs">aios-sheet-reader@mesmerizing-bee-481701-j6.iam.gserviceaccount.com</code>{" "}
            needs Viewer access on the folder.
          </p>
        </div>
      </section>
    )
  }

  let data
  let error: string | null = null
  try {
    data = await getNcrAnalytics()
  } catch (err) {
    error = err instanceof Error ? err.message : String(err)
  }

  return (
    <section className="space-y-5">
      <header className="flex items-start justify-between gap-3">
        <div>
          <p className="text-xs uppercase tracking-wider text-fg-subtle">Project 411 / NCR analytics</p>
          <h1 className="mt-1 text-2xl font-semibold tracking-tight text-fg">NCR Dashboard</h1>
          <p className="mt-1 text-sm text-fg-muted">
            Photos categorised from the WhatsApp -&gt; Google Drive folder.
          </p>
        </div>
        <div className="flex gap-2 text-xs">
          <Link href="/defects" className="rounded-md border border-border bg-surface px-3 py-1.5 text-fg-muted hover:border-border-strong hover:text-fg">
            Register
          </Link>
          <Link href="/ncr" className="rounded-md border border-border bg-surface px-3 py-1.5 text-fg-muted hover:border-border-strong hover:text-fg">
            Photo grid
          </Link>
        </div>
      </header>

      {error ? (
        <div className="rounded-xl border border-danger/30 bg-danger/10 p-4 text-sm">
          <p className="font-semibold text-danger">Error</p>
          <p className="mt-1 text-xs text-fg-muted">{error}</p>
        </div>
      ) : data && data.total > 0 ? (
        <>
          <NcrDashboardCharts data={data} />
          <NcrRecordsTable records={data.records} />
        </>
      ) : (
        <div className="rounded-xl border border-border bg-surface-2 p-4 text-sm text-fg-muted">
          No NCR photos yet. Send a WhatsApp photo with assembly + description to start populating.
        </div>
      )}
    </section>
  )
}
