/**
 * Postgres connection helper. Optional: if `POSTGRES_URL` is not set,
 * the helper logs a one-time warning and returns null. Callers must
 * handle null gracefully so the app still renders without a database.
 *
 * Schema lives in db/migrations/. Run migrations manually or via the
 * Vercel Postgres console; this lib does not auto-migrate.
 *
 * Uses the `postgres` package (no peer dependency on @vercel/postgres).
 */

import postgres, { type Sql } from "postgres"

let _client: Sql | null = null
let _warned = false

export function getDb(): Sql | null {
  if (_client) return _client
  const url = process.env.POSTGRES_URL ?? process.env.DATABASE_URL
  if (!url) {
    if (!_warned) {
      console.warn(
        "[db] POSTGRES_URL not set; persistent features (decision log, " +
          "supplier learning) will no-op until a database is provisioned.",
      )
      _warned = true
    }
    return null
  }
  _client = postgres(url, { ssl: "require", max: 4 })
  return _client
}

export async function isDbReachable(): Promise<{ ok: boolean; error?: string }> {
  const db = getDb()
  if (!db) return { ok: false, error: "POSTGRES_URL not set" }
  try {
    await db`select 1`
    return { ok: true }
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : String(err) }
  }
}
