/**
 * MER sync endpoint.
 *
 * Pulls the MER Google Sheet, parses, upserts to Postgres.
 *
 * Triggered by:
 *  - Vercel Cron (daily 1pm Sydney) via vercel.json
 *  - Manual refresh button in /budget UI (POST)
 *  - Direct GET for ad-hoc sync (auth-protected)
 */
import { NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { fetchMer } from "@/lib/sheets/mer"
import { getDb } from "@/lib/db/postgres"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

async function runSync() {
  const data = await fetchMer()
  const db = getDb()
  if (!db) {
    return { ok: false, error: "POSTGRES_URL not set", scopes: data.scopes.length, claims: data.claims.length }
  }

  // Upsert scopes
  for (const s of data.scopes) {
    await db`
      insert into mer_scopes (id, project_number, project_label, scope_name, scope_value, remaining_value, claimed_pct, is_variation, synced_at)
      values (${s.id}, ${s.projectNumber}, ${s.projectLabel}, ${s.scopeName},
              ${s.scopeValue}, ${s.remainingValue}, ${s.claimedPct}, ${s.isVariation}, now())
      on conflict (id) do update set
        project_label = excluded.project_label,
        scope_value = excluded.scope_value,
        remaining_value = excluded.remaining_value,
        claimed_pct = excluded.claimed_pct,
        is_variation = excluded.is_variation,
        synced_at = excluded.synced_at
    `
  }

  // Upsert claims
  for (const c of data.claims) {
    await db`
      insert into mer_claims (id, project_number, scope_name, year_month, remaining_value, claimed_pct, synced_at)
      values (${c.id}, ${c.projectNumber}, ${c.scopeName}, ${c.yearMonth},
              ${c.remainingValue}, ${c.claimedPct}, now())
      on conflict (id) do update set
        remaining_value = excluded.remaining_value,
        claimed_pct = excluded.claimed_pct,
        synced_at = excluded.synced_at
    `
  }

  // Update sync state
  await db`
    update mer_sync_state
    set last_synced_at = now(), last_scope_count = ${data.scopes.length},
        last_claim_count = ${data.claims.length}, last_error = null
    where id = 1
  `

  return {
    ok: true,
    scopes: data.scopes.length,
    claims: data.claims.length,
    months: data.monthsObserved,
    syncedAt: data.generatedAt,
  }
}

export async function GET(req: Request) {
  // Vercel Cron sends a special header; honour it without auth.
  // For interactive calls, require a session.
  const isCron = req.headers.get("x-vercel-cron") != null
  if (!isCron) {
    const session = await auth()
    if (!session) return NextResponse.json({ error: "unauthorized" }, { status: 401 })
  }
  try {
    const result = await runSync()
    return NextResponse.json(result, { status: result.ok ? 200 : 500 })
  } catch (err) {
    const db = getDb()
    if (db) {
      try {
        await db`update mer_sync_state set last_error = ${err instanceof Error ? err.message : String(err)} where id = 1`
      } catch {}
    }
    return NextResponse.json(
      { error: err instanceof Error ? err.message : String(err) },
      { status: 500 }
    )
  }
}

export async function POST(req: Request) {
  return GET(req)
}
