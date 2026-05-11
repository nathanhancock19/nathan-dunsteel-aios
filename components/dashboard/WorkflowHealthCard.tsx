import { listWorkflows, listExecutions } from "@/lib/n8n/client"
import { Card, EmptyState, ErrorState, ConfigState } from "./Card"

export async function WorkflowHealthCard() {
  if (!process.env.N8N_BASE_URL || !(process.env.N8N_API_KEY_DUNSTEEL ?? process.env.N8N_API_KEY)) {
    return (
      <Card title="n8n workflows">
        <ConfigState envVar="N8N_BASE_URL + N8N_API_KEY_DUNSTEEL" />
      </Card>
    )
  }
  try {
    const [workflows, recent] = await Promise.all([listWorkflows(), listExecutions({ limit: 100 })])
    const lastByWorkflow = new Map<string, (typeof recent)[number]>()
    for (const e of recent) {
      const existing = lastByWorkflow.get(e.workflowId)
      if (!existing || e.startedAt > existing.startedAt) lastByWorkflow.set(e.workflowId, e)
    }

    const failures24h = recent.filter(
      (e) => e.status === "error" && (Date.now() - new Date(e.startedAt).getTime()) < 86400_000
    )
    const active = workflows.filter((w) => w.active)

    if (workflows.length === 0) {
      return (
        <Card title="n8n workflows">
          <EmptyState>No workflows.</EmptyState>
        </Card>
      )
    }

    return (
      <Card title="n8n workflows" subtitle={`${active.length}/${workflows.length} active`}>
        {failures24h.length > 0 ? (
          <p className="mb-2 text-xs text-red-300">{failures24h.length} failure(s) in last 24h</p>
        ) : null}
        <ul className="space-y-1.5 text-xs">
          {workflows.slice(0, 6).map((w) => {
            const last = lastByWorkflow.get(w.id)
            const dot = !w.active
              ? "bg-rule"
              : last?.status === "error"
              ? "bg-red-500"
              : last?.status === "success"
              ? "bg-emerald-500"
              : "bg-yellow-400"
            return (
              <li key={w.id} className="flex items-center gap-2">
                <span className={`inline-block h-2 w-2 rounded-full ${dot}`} aria-hidden />
                <span className="flex-1 truncate text-cream">{w.name}</span>
                <span className="text-[10px] uppercase tracking-wider text-muted">
                  {last ? new Date(last.startedAt).toLocaleDateString("en-AU", { day: "numeric", month: "short" }) : "no runs"}
                </span>
              </li>
            )
          })}
        </ul>
        {workflows.length > 6 ? <p className="mt-2 text-xs text-muted">+{workflows.length - 6} more</p> : null}
      </Card>
    )
  } catch (err) {
    return (
      <Card title="n8n workflows">
        <ErrorState message={err instanceof Error ? err.message : String(err)} />
      </Card>
    )
  }
}
