/**
 * n8n REST API client.
 *
 * Uses the n8n self-hosted instance API. Reads:
 *   N8N_BASE_URL   - e.g. https://n8n.dunsteel.com.au
 *   N8N_API_KEY_DUNSTEEL - personal API key from n8n settings
 *
 * If env vars are missing, every method throws a clear error so callers can
 * degrade gracefully (e.g. show "n8n not configured" in UI).
 */

export type N8nWorkflow = {
  id: string
  name: string
  active: boolean
  createdAt: string
  updatedAt: string
}

export type N8nExecution = {
  id: string
  workflowId: string
  workflowName?: string
  status: "success" | "error" | "running" | "waiting" | "canceled" | string
  mode: string
  startedAt: string
  stoppedAt?: string | null
  finished: boolean
}

function baseUrl(): string {
  const raw = process.env.N8N_BASE_URL
  if (!raw) throw new Error("N8N_BASE_URL not set")
  return raw.replace(/\/+$/, "")
}

function apiKey(): string {
  const k = process.env.N8N_API_KEY_DUNSTEEL ?? process.env.N8N_API_KEY
  if (!k) throw new Error("N8N_API_KEY_DUNSTEEL not set")
  return k
}

async function n8nGet<T>(path: string): Promise<T> {
  const url = `${baseUrl()}/api/v1${path}`
  const res = await fetch(url, {
    headers: { "X-N8N-API-KEY": apiKey(), Accept: "application/json" },
    cache: "no-store",
  })
  if (!res.ok) {
    throw new Error(`n8n GET ${path}: HTTP ${res.status} ${await res.text().catch(() => "")}`)
  }
  return (await res.json()) as T
}

export async function listWorkflows(): Promise<N8nWorkflow[]> {
  const data = await n8nGet<{ data: N8nWorkflow[] }>("/workflows?limit=100")
  return data.data
}

export async function listExecutions(opts?: {
  workflowId?: string
  limit?: number
  status?: "success" | "error" | "waiting"
}): Promise<N8nExecution[]> {
  const params = new URLSearchParams()
  params.set("limit", String(opts?.limit ?? 25))
  if (opts?.workflowId) params.set("workflowId", opts.workflowId)
  if (opts?.status) params.set("status", opts.status)
  const data = await n8nGet<{ data: N8nExecution[] }>(`/executions?${params.toString()}`)
  return data.data
}

export async function getRecentFailures(limit = 10): Promise<N8nExecution[]> {
  const data = await listExecutions({ status: "error", limit })
  return data
}

export async function pingN8n(): Promise<{ ok: boolean; workflowCount?: number; error?: string }> {
  try {
    const w = await listWorkflows()
    return { ok: true, workflowCount: w.length }
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : String(err) }
  }
}
