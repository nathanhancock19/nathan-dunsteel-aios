/**
 * Morning push cron — fires once a day at 06:30 Sydney via Vercel Cron.
 *
 * Vercel Cron sends a header "x-vercel-cron-signature" which we currently
 * trust by default; gating with CRON_SECRET is a Phase 6 polish item.
 *
 * Schedule lives in vercel.json. Adjust the cron there, not here.
 */

import { sendMorningPush } from "@/lib/inbox/push"
import { NextResponse } from "next/server"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

function unauthorised() {
  return new Response("Unauthorised", { status: 401 })
}

export async function GET(req: Request) {
  // Allow Vercel Cron, or anyone with CRON_SECRET (manual triggers)
  const secret = process.env.CRON_SECRET
  if (secret) {
    const auth = req.headers.get("authorization") ?? ""
    if (auth !== `Bearer ${secret}`) return unauthorised()
  }
  try {
    const result = await sendMorningPush()
    return NextResponse.json({ ok: true, ...result })
  } catch (err) {
    return NextResponse.json(
      { ok: false, error: err instanceof Error ? err.message : String(err) },
      { status: 500 },
    )
  }
}
