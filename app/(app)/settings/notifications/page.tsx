import { Card } from "@/components/ui/Card"
import { Pill } from "@/components/ui/Pill"
import { Bell, Clock, AlertTriangle } from "lucide-react"

export const dynamic = "force-dynamic"

export default function NotificationsPage() {
  const telegramConfigured = !!process.env.DUNSTEEL_BOT_TOKEN && !!process.env.DUNSTEEL_CHAT_ID

  return (
    <div className="space-y-4">
      <Card title="Morning Telegram digest" icon={Bell}>
        <p className="mb-3 text-sm text-fg-muted">
          A daily digest sent via the Dunsteel Telegram bot. Includes inbox items, deliveries, claims due, defects.
        </p>
        <div className="flex items-center gap-3">
          <Pill tone={telegramConfigured ? "success" : "warning"}>
            {telegramConfigured ? "Active" : "Not configured"}
          </Pill>
          <div className="flex items-center gap-1.5 text-xs text-fg-muted">
            <Clock className="h-3.5 w-3.5" />
            <span>06:30 Sydney daily</span>
          </div>
        </div>
        {!telegramConfigured ? (
          <p className="mt-3 text-xs text-fg-muted">
            Set <code className="rounded bg-surface-3 px-1 py-0.5">DUNSTEEL_BOT_TOKEN</code> and{" "}
            <code className="rounded bg-surface-3 px-1 py-0.5">DUNSTEEL_CHAT_ID</code> in env to enable.
          </p>
        ) : null}
      </Card>

      <Card title="Variance alerts" icon={AlertTriangle} tone="warning">
        <p className="text-sm text-fg-muted">
          Threshold-based push alerts when a scope exceeds budget by more than the configured percentage. Default: 5%.
        </p>
        <p className="mt-2 text-xs text-fg-subtle">
          Set <code className="rounded bg-surface-3 px-1 py-0.5">PBI_VARIANCE_THRESHOLD_PCT</code> in env. Currently activates when
          Strumis cost data is available (paused).
        </p>
      </Card>

      <Card title="Customisable preferences">
        <p className="text-sm text-fg-muted">
          Per-user notification preferences (mute hours, threshold tuning, channel selection) are a v2 feature. v1 reads
          everything from env vars on the Vercel project.
        </p>
      </Card>
    </div>
  )
}
