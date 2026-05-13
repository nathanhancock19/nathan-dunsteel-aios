/**
 * Sync All — fan out a refresh against every data source in parallel.
 *
 * This is a "prime the caches and tell me what worked" endpoint. It does
 * NOT mutate any external system. Most generators here read live (no
 * caching layer yet), so the value of "sync" is:
 *   1. surfacing which sources are healthy and which are erroring
 *   2. forcing the MER Postgres mirror to re-pull the sheet
 *   3. giving the client a known-good moment to call router.refresh()
 *
 * Returns per-source status so the UI can toast each one.
 */
import { NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { runInbox } from "@/lib/inbox"
import { getDeliveriesForCurrentWeek } from "@/lib/sheets/deliveries"
import { getDiaryEntriesForDate } from "@/lib/notion/diary"
import { getRecentSiteDiaryEntries, getHighPriorityNotes } from "@/lib/notion"
import { getNcrAnalytics } from "@/lib/drive/ncr-analytics"
import { listVariations } from "@/lib/airtable/variations"
import { getMerSyncStatus } from "@/lib/strumis/queries"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

type SourceResult = {
  source: string
  status: "ok" | "error"
  durationMs: number
  error?: string
  count?: number
}

async function runSource(name: string, fn: () => Promise<number | undefined>): Promise<SourceResult> {
  const start = Date.now()
  try {
    const count = await fn()
    return { source: name, status: "ok", durationMs: Date.now() - start, count }
  } catch (err) {
    return {
      source: name,
      status: "error",
      durationMs: Date.now() - start,
      error: err instanceof Error ? err.message : String(err),
    }
  }
}

async function runAll(): Promise<SourceResult[]> {
  const project = process.env.AIOS_PRIMARY_PROJECT_NUMBER
  const tasks: Array<Promise<SourceResult>> = [
    runSource("inbox", async () => (await runInbox()).length),
    runSource("deliveries-week", async () => {
      const week = await getDeliveriesForCurrentWeek({ projectFilter: project })
      return week.reduce((n, d) => n + d.jobs.length, 0)
    }),
    runSource("diary-today", async () => (await getDiaryEntriesForDate()).length),
    runSource("diary-recent", async () => (await getRecentSiteDiaryEntries(10)).length),
    runSource("high-priority-notes", async () => {
      if (!process.env.NOTION_GENERAL_NOTES_DB) {
        throw new Error("NOTION_GENERAL_NOTES_DB not set")
      }
      return (await getHighPriorityNotes(project)).length
    }),
    runSource("ncr-defects", async () => {
      const a = await getNcrAnalytics()
      return a.total
    }),
    runSource("variations", async () => {
      const open = await listVariations({ status: "Open" })
      return open.length
    }),
    runSource("mer", async () => {
      // MER lives in Postgres mirror; report freshness rather than re-pull
      // (the MER cron handles repulls at 1pm Sydney; manual refresh is
      // available at /api/sync/mer for an explicit kick).
      const status = await getMerSyncStatus()
      return status?.lastClaimCount ?? 0
    }),
  ]
  return Promise.all(tasks)
}

export async function POST() {
  const session = await auth()
  if (!session) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 })
  }

  const started = Date.now()
  const results = await runAll()
  const totalMs = Date.now() - started
  const okCount = results.filter((r) => r.status === "ok").length
  const errCount = results.length - okCount

  return NextResponse.json({
    ok: errCount === 0,
    okCount,
    errCount,
    totalMs,
    results,
  })
}

export async function GET() {
  return POST()
}
