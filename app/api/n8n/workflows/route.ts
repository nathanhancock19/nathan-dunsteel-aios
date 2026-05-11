import { NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { listWorkflows, listExecutions } from "@/lib/n8n/client"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

export async function GET() {
  const session = await auth()
  if (!session) return NextResponse.json({ error: "unauthorized" }, { status: 401 })
  try {
    const workflows = await listWorkflows()
    // Pull last execution per workflow (best-effort, in parallel)
    const recent = await listExecutions({ limit: 50 })
    const lastByWorkflow = new Map<string, (typeof recent)[number]>()
    for (const e of recent) {
      const existing = lastByWorkflow.get(e.workflowId)
      if (!existing || e.startedAt > existing.startedAt) lastByWorkflow.set(e.workflowId, e)
    }
    const enriched = workflows.map((w) => ({
      id: w.id,
      name: w.name,
      active: w.active,
      lastExecution: lastByWorkflow.get(w.id) ?? null,
    }))
    return NextResponse.json({ workflows: enriched })
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : String(err) }, { status: 500 })
  }
}
