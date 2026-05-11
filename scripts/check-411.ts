import postgres from "postgres"

async function main() {
  const sql = postgres(process.env.POSTGRES_URL!, { ssl: "require", max: 4 })
  console.log("Project 411 scopes in Postgres:")
  const scopes = await sql<Array<any>>`
    select scope_name, scope_value, remaining_value, claimed_pct, is_variation
    from mer_scopes where project_number = '411'
    order by is_variation, scope_name
  `
  console.log(`Total: ${scopes.length}`)
  let totalValue = 0
  for (const s of scopes) {
    totalValue += Number(s.scope_value ?? 0)
    const v = s.is_variation ? "VAR " : "    "
    console.log(`  ${v}${s.scope_name.padEnd(30)}  $${Number(s.scope_value).toLocaleString().padStart(12)}  rem=$${Number(s.remaining_value).toLocaleString().padStart(12)}  ${((Number(s.claimed_pct)||0)*100).toFixed(0)}%`)
  }
  console.log(`Contract total: $${totalValue.toLocaleString()}`)
  await sql.end()
}
main().catch(e => { console.error(e); process.exit(1) })
