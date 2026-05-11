import { fetchMer } from "../lib/sheets/mer"

async function main() {
  const data = await fetchMer()
  console.log("Months found:", data.monthsObserved.join(", "))
  console.log("Total scopes:", data.scopes.length)
  console.log("Total claims:", data.claims.length)
  console.log()

  const by411 = data.scopes.filter((s) => s.projectNumber === "411")
  console.log(`Project 411 scopes: ${by411.length}`)
  const total411 = by411.reduce((s, x) => s + (x.scopeValue ?? 0), 0)
  const rem411 = by411.reduce((s, x) => s + (x.remainingValue ?? 0), 0)
  console.log(`  Total scope value: $${total411.toLocaleString()}`)
  console.log(`  Remaining value:  $${rem411.toLocaleString()}`)
  console.log(`  Claimed: $${(total411 - rem411).toLocaleString()} (${total411 > 0 ? (((total411 - rem411) / total411) * 100).toFixed(1) : 0}%)`)
  console.log("\nFirst 5 411 scopes:")
  for (const s of by411.slice(0, 5)) {
    console.log(`  ${s.scopeName} | value=$${s.scopeValue?.toLocaleString()} | remaining=$${s.remainingValue?.toLocaleString()} | claimed=${s.claimedPct ? (s.claimedPct * 100).toFixed(1) + "%" : "-"}`)
  }
}

main().catch((e) => { console.error(e); process.exit(1) })
