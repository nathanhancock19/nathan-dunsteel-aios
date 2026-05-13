"use client"

import { useRouter } from "next/navigation"
import { useState, useTransition } from "react"

/**
 * One-click refresh for every dashboard data source.
 *
 * Posts to /api/sync/all (parallel fan-out), then triggers a server-component
 * refresh so cards re-render with the new data. Surfaces per-source pass/fail
 * inline below the button for a few seconds.
 */
type SourceResult = {
  source: string
  status: "ok" | "error"
  durationMs: number
  error?: string
  count?: number
}

type Summary = {
  ok: boolean
  okCount: number
  errCount: number
  totalMs: number
  results: SourceResult[]
}

export function SyncAllButton() {
  const router = useRouter()
  const [pending, startTransition] = useTransition()
  const [busy, setBusy] = useState(false)
  const [summary, setSummary] = useState<Summary | null>(null)

  async function onClick() {
    if (busy) return
    setBusy(true)
    setSummary(null)
    try {
      const res = await fetch("/api/sync/all", { method: "POST" })
      const body = (await res.json()) as Summary | { error: string }
      if ("error" in body) {
        setSummary({
          ok: false,
          okCount: 0,
          errCount: 1,
          totalMs: 0,
          results: [{ source: "request", status: "error", durationMs: 0, error: body.error }],
        })
        return
      }
      setSummary(body)
      // Server components re-render on router.refresh(); client components
      // (most notably the Inbox) need an explicit nudge to re-fetch their
      // own data.
      if (typeof window !== "undefined") {
        window.dispatchEvent(new CustomEvent("aios:sync-complete"))
      }
      startTransition(() => router.refresh())
    } catch (err) {
      setSummary({
        ok: false,
        okCount: 0,
        errCount: 1,
        totalMs: 0,
        results: [
          {
            source: "request",
            status: "error",
            durationMs: 0,
            error: err instanceof Error ? err.message : String(err),
          },
        ],
      })
    } finally {
      setBusy(false)
    }
  }

  const isBusy = busy || pending

  return (
    <div className="relative flex flex-col items-end gap-1">
      <button
        type="button"
        onClick={onClick}
        disabled={isBusy}
        className="inline-flex items-center gap-2 rounded-md border border-rule bg-surface-2 px-3 py-1.5 text-xs font-medium text-cream hover:bg-highlight disabled:cursor-wait disabled:opacity-60"
        title="Refresh every dashboard data source"
      >
        <span
          className={`inline-block size-3 rounded-full ${
            isBusy ? "animate-spin border-2 border-cream border-t-transparent" : "bg-emerald-500"
          }`}
          aria-hidden
        />
        {isBusy ? "Syncing…" : "Sync all"}
      </button>
      {summary && !isBusy && (
        <SyncSummary summary={summary} onDismiss={() => setSummary(null)} />
      )}
    </div>
  )
}

function SyncSummary({ summary, onDismiss }: { summary: Summary; onDismiss: () => void }) {
  return (
    <div className="absolute right-0 top-full z-20 mt-2 w-72 rounded-md border border-rule bg-ink p-3 text-xs shadow-lg">
      <div className="mb-2 flex items-center justify-between">
        <span className="font-medium text-cream">
          {summary.ok
            ? `Synced ${summary.okCount}/${summary.okCount + summary.errCount} sources`
            : `${summary.errCount} source${summary.errCount > 1 ? "s" : ""} failed`}
        </span>
        <button
          onClick={onDismiss}
          className="text-muted hover:text-cream"
          aria-label="Dismiss"
        >
          ×
        </button>
      </div>
      <ul className="space-y-1">
        {summary.results.map((r) => (
          <li key={r.source} className="flex items-center justify-between gap-2">
            <span className="flex items-center gap-2 text-muted">
              <span
                className={`inline-block size-2 rounded-full ${
                  r.status === "ok" ? "bg-emerald-500" : "bg-red-500"
                }`}
                aria-hidden
              />
              <span>{r.source}</span>
            </span>
            <span className={r.status === "ok" ? "text-muted" : "text-red-400"}>
              {r.status === "ok"
                ? `${r.count ?? 0} · ${r.durationMs}ms`
                : (r.error ?? "error").slice(0, 32)}
            </span>
          </li>
        ))}
      </ul>
    </div>
  )
}
