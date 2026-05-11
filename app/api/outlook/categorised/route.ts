import { NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { getCategorisedMessages, outlookConfigured } from "@/lib/outlook/client"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

export async function GET() {
  const session = await auth()
  if (!session) return NextResponse.json({ error: "unauthorized" }, { status: 401 })
  if (!outlookConfigured()) {
    return NextResponse.json({ configured: false, messages: [] })
  }
  try {
    const messages = await getCategorisedMessages()
    return NextResponse.json({ configured: true, messages })
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : String(err) }, { status: 500 })
  }
}
