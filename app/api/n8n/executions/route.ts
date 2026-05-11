import { NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { listExecutions } from "@/lib/n8n/client"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

export async function GET(req: Request) {
  const session = await auth()
  if (!session) return NextResponse.json({ error: "unauthorized" }, { status: 401 })
  const url = new URL(req.url)
  const status = url.searchParams.get("status") as "success" | "error" | "waiting" | null
  const workflowId = url.searchParams.get("workflowId") ?? undefined
  const limit = Number(url.searchParams.get("limit") ?? 25)
  try {
    const executions = await listExecutions({
      status: status ?? undefined,
      workflowId,
      limit,
    })
    return NextResponse.json({ executions })
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : String(err) }, { status: 500 })
  }
}
