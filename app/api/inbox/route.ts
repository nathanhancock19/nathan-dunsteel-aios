/**
 * GET /api/inbox
 *
 * Returns the current inbox items. Per-device state (snooze, done,
 * waiting) is applied client-side from localStorage; this route only
 * returns raw generator output.
 */

import { auth } from "@/lib/auth"
import { runInbox } from "@/lib/inbox"
import { NextResponse } from "next/server"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

export async function GET() {
  const session = await auth()
  if (!session) return new Response("Unauthorized", { status: 401 })

  try {
    const items = await runInbox()
    return NextResponse.json({ items })
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : String(err) },
      { status: 500 },
    )
  }
}
