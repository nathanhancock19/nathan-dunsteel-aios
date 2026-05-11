import { getMerSyncStatus } from "@/lib/strumis/queries"
import { RefreshMerButton } from "./RefreshMerButton"

function formatAge(hours: number | null): string {
  if (hours == null) return "never"
  if (hours < 1) return `${Math.round(hours * 60)} minutes ago`
  if (hours < 24) return `${Math.round(hours)} hours ago`
  return `${Math.round(hours / 24)} days ago`
}

export async function MerSyncStatus() {
  const status = await getMerSyncStatus()
  const stale = status.ageHours != null && status.ageHours > 30
  return (
    <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-rule bg-ink/60 p-3 text-xs">
      <div className="flex items-center gap-2">
        <span className={`inline-block h-2 w-2 rounded-full ${stale ? "bg-yellow-400" : "bg-emerald-500"}`} aria-hidden />
        <span className="text-muted">
          MER synced {formatAge(status.ageHours)}
          {status.lastScopeCount != null ? ` - ${status.lastScopeCount} scopes, ${status.lastClaimCount ?? 0} claims` : ""}
          {status.lastError ? ` - last error: ${status.lastError}` : ""}
        </span>
      </div>
      <RefreshMerButton />
    </div>
  )
}
