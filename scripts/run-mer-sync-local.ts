import { fetchMer } from "../lib/sheets/mer"
import postgres from "postgres"

async function main() {
  const sql = postgres(process.env.POSTGRES_URL!, { ssl: "require", max: 4 })
  const data = await fetchMer()
  console.log(`Parsed: ${data.scopes.length} scopes, ${data.claims.length} claims`)
  for (const s of data.scopes) {
    await sql`
      insert into mer_scopes (id, project_number, project_label, scope_name, scope_value, remaining_value, claimed_pct, is_variation, synced_at)
      values (${s.id}, ${s.projectNumber}, ${s.projectLabel}, ${s.scopeName}, ${s.scopeValue}, ${s.remainingValue}, ${s.claimedPct}, ${s.isVariation}, now())
      on conflict (id) do update set
        project_label = excluded.project_label,
        scope_value = excluded.scope_value,
        remaining_value = excluded.remaining_value,
        claimed_pct = excluded.claimed_pct,
        is_variation = excluded.is_variation,
        synced_at = excluded.synced_at
    `
  }
  for (const c of data.claims) {
    await sql`
      insert into mer_claims (id, project_number, scope_name, year_month, remaining_value, claimed_pct, synced_at)
      values (${c.id}, ${c.projectNumber}, ${c.scopeName}, ${c.yearMonth}, ${c.remainingValue}, ${c.claimedPct}, now())
      on conflict (id) do update set
        remaining_value = excluded.remaining_value,
        claimed_pct = excluded.claimed_pct,
        synced_at = excluded.synced_at
    `
  }
  await sql`
    update mer_sync_state
    set last_synced_at = now(),
        last_scope_count = ${data.scopes.length},
        last_claim_count = ${data.claims.length},
        last_error = null
    where id = 1
  `
  console.log("Postgres upserts complete.")
  await sql.end()
}
main().catch((e) => { console.error(e); process.exit(1) })
