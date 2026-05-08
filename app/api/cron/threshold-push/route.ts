/**
 * Threshold push cron — runs every 15 minutes during work hours.
 *
 * Detects new NOW-tier items from high-signal sources (PO, delivery)
 * and fires a single Telegram heads-up. Items already pushed (morning
 * or threshold) within 24h are suppressed via push_history.
 */

import { sendThresholdPush } from "@/lib/inbox/push"
import { NextResponse } from "next/server"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

function unauthorised() {
  return new Response("Unauthorised", { status: 401 })
}

export async function GET(req: Request) {
  const secret = process.env.CRON_SECRET
  if (secret) {
    const auth = req.headers.get("authorization") ?? ""
    if (auth !== `Bearer ${secret}`) return unauthorised()
  }
  try {
    const result = await sendThresholdPush()
    return NextResponse.json({ ok: true, ...result })
  } catch (err) {
    return NextResponse.json(
      { ok: false, error: err instanceof Error ? err.message : String(err) },
      { status: 500 },
    )
  }
}
