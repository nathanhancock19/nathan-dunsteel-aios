/**
 * Deep diagnostic for the 6 Notion DBs.
 * Tests multiple Notion-Version headers + direct data_source ID resolution.
 */
const TIMEOUT = 20000
const sleep = (ms) => new Promise((r) => setTimeout(r, ms))

async function fetchT(url, opts = {}) {
  const ctrl = new AbortController()
  const t = setTimeout(() => ctrl.abort(), TIMEOUT)
  try { return await fetch(url, { ...opts, signal: ctrl.signal }) }
  finally { clearTimeout(t) }
}

async function main() {
  const key = process.env.NOTION_API_KEY
  if (!key) { console.error("NOTION_API_KEY missing"); process.exit(1) }

  console.log("=== Step 1: Identify the integration this token belongs to ===")
  const meRes = await fetchT("https://api.notion.com/v1/users/me", {
    headers: { Authorization: `Bearer ${key}`, "Notion-Version": "2022-06-28" },
  })
  const me = await meRes.json()
  console.log("  bot:", me.bot ? `name="${me.bot.workspace_name ?? "?"}", owner_type=${me.bot.owner?.type}` : "(no bot info)")
  console.log("  name:", me.name ?? "(none)")
  console.log("  id:", me.id)

  console.log("\n=== Step 2: Search for databases this integration can see ===")
  const searchRes = await fetchT("https://api.notion.com/v1/search", {
    method: "POST",
    headers: { Authorization: `Bearer ${key}`, "Notion-Version": "2022-06-28", "Content-Type": "application/json" },
    body: JSON.stringify({ filter: { property: "object", value: "database" }, page_size: 100 }),
  })
  const searchData = await searchRes.json()
  if (!searchRes.ok) {
    console.log("  search FAILED:", searchData.message)
    return
  }
  const databases = searchData.results
  console.log(`  found ${databases.length} databases (via 2022-06-28 filter:database)`)

  // Map of expected DB IDs from env
  const expected = {
    Performance: process.env.NOTION_PERFORMANCE_DIARY_DB,
    Subcon: process.env.NOTION_SUBCON_DIARY_DB,
    VoiceMemo: process.env.NOTION_VOICE_MEMO_LOG_DB,
    Defects411: process.env.NOTION_DEFECTS_411_DB,
    GeneralNotes: process.env.NOTION_GENERAL_NOTES_DB,
    Projects: process.env.NOTION_PROJECTS_DB,
  }
  console.log("\n  Expected IDs from env:")
  for (const [k, v] of Object.entries(expected)) console.log(`    ${k.padEnd(15)} ${v}`)

  console.log("\n=== Step 3: Cross-check expected IDs against what search returned ===")
  const seenIds = new Set(databases.map((d) => d.id.replaceAll("-", "")))
  for (const [name, id] of Object.entries(expected)) {
    const norm = id?.replaceAll("-", "")
    const found = norm && seenIds.has(norm)
    console.log(`  ${found ? "[+]" : "[-]"} ${name.padEnd(15)} ${id}  ${found ? "(in search results)" : "(NOT in search results)"}`)
  }

  console.log("\n=== Step 4: Direct retrieve with multiple Notion-Version headers ===")
  const versions = ["2022-06-28", "2024-04-16", "2025-09-03"]
  const sampleId = expected.Defects411
  for (const v of versions) {
    const r = await fetchT(`https://api.notion.com/v1/databases/${sampleId}`, {
      headers: { Authorization: `Bearer ${key}`, "Notion-Version": v },
    })
    const d = await r.json()
    console.log(`  v=${v.padEnd(10)} -> HTTP ${r.status} ${r.ok ? "(OK)" : "FAIL"}: ${d.message ? d.message.split("\n")[0].slice(0, 80) : "ok"}`)
    await sleep(300)
  }

  console.log("\n=== Step 5: Inspect the search-found databases directly ===")
  // Find Defects 411 in search results and use ITS exact ID
  const defectsHit = databases.find((d) => {
    const t = d.title?.map((t) => t.plain_text).join("").toLowerCase() ?? ""
    return t.includes("defect") && t.includes("411")
  })
  if (defectsHit) {
    console.log(`  Defects-411 search-result ID: ${defectsHit.id}`)
    console.log(`  parent: ${JSON.stringify(defectsHit.parent)}`)
    const r = await fetchT(`https://api.notion.com/v1/databases/${defectsHit.id}`, {
      headers: { Authorization: `Bearer ${key}`, "Notion-Version": "2022-06-28" },
    })
    const d = await r.json()
    console.log(`  Retrieve via search-result ID -> HTTP ${r.status}: ${d.message ?? "ok"}`)
  } else {
    console.log("  Defects-411 NOT found in search results")
  }

  console.log("\n=== Step 6: Try v5 data_sources path ===")
  // List databases via search, then for each, try data_sources path
  if (defectsHit) {
    const r1 = await fetchT(`https://api.notion.com/v1/databases/${defectsHit.id}`, {
      headers: { Authorization: `Bearer ${key}`, "Notion-Version": "2025-09-03" },
    })
    const d1 = await r1.json()
    console.log(`  Retrieve database (v5): HTTP ${r1.status}`)
    if (r1.ok && d1.data_sources) {
      console.log(`  data_sources: ${d1.data_sources.length}`)
      for (const ds of d1.data_sources) {
        console.log(`    - ${ds.id}  name=${ds.name ?? "?"}`)
      }
      if (d1.data_sources[0]) {
        const dsId = d1.data_sources[0].id
        const r2 = await fetchT(`https://api.notion.com/v1/data_sources/${dsId}/query`, {
          method: "POST",
          headers: { Authorization: `Bearer ${key}`, "Notion-Version": "2025-09-03", "Content-Type": "application/json" },
          body: JSON.stringify({ page_size: 1 }),
        })
        const d2 = await r2.json()
        console.log(`  Query data_source: HTTP ${r2.status}, ${d2.results?.length ?? 0} rows`)
      }
    }
  }
}

main().catch((e) => { console.error(e); process.exit(1) })
