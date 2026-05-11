/**
 * Smoke test the new Postgres tables: write a sample row to each, count, clean up.
 */
import postgres from "postgres"

const url = process.env.POSTGRES_URL ?? process.env.DATABASE_URL
if (!url) { console.error("POSTGRES_URL not set"); process.exit(1) }
const sql = postgres(url, { ssl: "require", max: 1 })

const SAMPLE_PREFIX = "smoke-test-2026-05-11"

try {
  console.log("=== Tables present ===")
  const tables = await sql`
    select tablename from pg_tables
    where schemaname = 'public'
    order by tablename
  `
  for (const t of tables) console.log("  -", t.tablename)
  console.log()

  console.log("=== Test decisions table ===")
  await sql`
    insert into decisions (actor, category, subject, body, source_id)
    values ('assistant', 'note', 'smoke-test', '{"text":"hello from claude"}'::jsonb, ${SAMPLE_PREFIX})
  `
  const decisions = await sql`select count(*)::int as n from decisions where source_id = ${SAMPLE_PREFIX}`
  console.log("  inserted, count:", decisions[0]?.n)
  await sql`delete from decisions where source_id = ${SAMPLE_PREFIX}`
  console.log("  cleaned up")
  console.log()

  console.log("=== Test mer_sync_state table ===")
  const merState = await sql`select * from mer_sync_state where id = 1`
  console.log("  sync state row:", JSON.stringify(merState[0] ?? "(empty)"))
  console.log()

  console.log("=== Test sync_runs table ===")
  await sql`
    insert into sync_runs (id, started_at, source, status)
    values (${SAMPLE_PREFIX}, now(), 'desktop', 'in_progress')
  `
  const runs = await sql`select * from sync_runs where id = ${SAMPLE_PREFIX}`
  console.log("  inserted run:", runs[0]?.id, runs[0]?.status)
  await sql`delete from sync_runs where id = ${SAMPLE_PREFIX}`
  console.log("  cleaned up")
  console.log()

  console.log("[+] Postgres OK")
} catch (e) {
  console.error("[-] FAIL:", e.message)
  process.exit(2)
} finally {
  await sql.end()
}
