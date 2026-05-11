import postgres from "postgres"

async function main() {
  const sql = postgres(process.env.POSTGRES_URL!, { ssl: "require", max: 4 })
  // Delete template/placeholder rows that shouldn't be there
  const res = await sql`
    delete from mer_scopes
    where scope_name ilike '%template%' or scope_name ilike '%copy this%'
    returning scope_name, project_number
  `
  console.log(`Deleted ${res.length} template scopes:`)
  for (const r of res) console.log(`  ${r.project_number} - ${r.scope_name}`)
  const cres = await sql`
    delete from mer_claims
    where scope_name ilike '%template%' or scope_name ilike '%copy this%'
  `
  console.log(`Deleted ${cres.count} template claim rows`)
  await sql.end()
}
main().catch(e => { console.error(e); process.exit(1) })
