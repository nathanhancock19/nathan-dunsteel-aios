/**
 * Retry just the failing services with fixes:
 *  - Airtable: spaced retries (probably hit rate limit)
 *  - Outlook: try both app registrations from workspace .env
 *  - Notion DB retrieval via dataSources.query (the v5 path) instead of retrieve
 */

const TIMEOUT = 20000

function log(svc, ok, detail) { console.log(`${ok ? "[+] PASS" : "[-] FAIL"}  ${svc.padEnd(40)} ${detail}`) }
const sleep = (ms) => new Promise((r) => setTimeout(r, ms))

async function fetchT(url, opts = {}) {
  const ctrl = new AbortController()
  const t = setTimeout(() => ctrl.abort(), TIMEOUT)
  try { return await fetch(url, { ...opts, signal: ctrl.signal }) }
  finally { clearTimeout(t) }
}

async function airtableTable(name) {
  const key = process.env.AIRTABLE_API_KEY
  const base = process.env.AIRTABLE_BASE_ID
  // Two attempts with backoff
  for (let attempt = 1; attempt <= 3; attempt++) {
    const r = await fetchT(`https://api.airtable.com/v0/${base}/${encodeURIComponent(name)}?maxRecords=1`, {
      headers: { Authorization: `Bearer ${key}` },
    })
    if (r.ok) {
      const d = await r.json()
      log(`Airtable: ${name}`, true, `${d.records?.length ?? 0} record(s) (attempt ${attempt})`)
      return
    }
    if (r.status !== 429) {
      const e = await r.json().catch(() => ({}))
      log(`Airtable: ${name}`, false, `${r.status}: ${e.error?.type ?? e.error?.message ?? r.statusText}`)
      return
    }
    await sleep(1500 * attempt)
  }
  log(`Airtable: ${name}`, false, "still rate-limited after 3 attempts")
}

async function notionDbViaSearch(envKey, label) {
  const id = process.env[envKey]
  if (!id) return log(`Notion: ${label}`, false, `${envKey} not set`)
  const key = process.env.NOTION_API_KEY
  // Try v5 dataSources query (which our app code uses)
  // First retrieve to get data source id
  const r1 = await fetchT(`https://api.notion.com/v1/databases/${id}`, {
    headers: { Authorization: `Bearer ${key}`, "Notion-Version": "2025-09-03" },
  })
  if (!r1.ok) {
    const e = await r1.json().catch(() => ({}))
    return log(`Notion v5: ${label}`, false, `${r1.status}: ${(e.message ?? r1.statusText).slice(0, 100)}`)
  }
  const d = await r1.json()
  const dsId = d.data_sources?.[0]?.id ?? id

  const r2 = await fetchT(`https://api.notion.com/v1/data_sources/${dsId}/query`, {
    method: "POST",
    headers: { Authorization: `Bearer ${key}`, "Notion-Version": "2025-09-03", "Content-Type": "application/json" },
    body: JSON.stringify({ page_size: 1 }),
  })
  if (!r2.ok) {
    const e = await r2.json().catch(() => ({}))
    return log(`Notion v5: ${label}`, false, `${r2.status}: ${(e.message ?? r2.statusText).slice(0, 100)}`)
  }
  const d2 = await r2.json()
  log(`Notion v5: ${label}`, true, `${d2.results?.length ?? 0} record(s) via data_sources/query`)
}

async function outlook(label, cid, sec, upn) {
  const tid = process.env.MS_TENANT_ID
  if (!tid) return log(`Outlook ${label} token`, false, "MS_TENANT_ID not set")
  const r = await fetchT(`https://login.microsoftonline.com/${tid}/oauth2/v2.0/token`, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "client_credentials", client_id: cid, client_secret: sec,
      scope: "https://graph.microsoft.com/.default",
    }),
  })
  const d = await r.json()
  if (!r.ok) return log(`Outlook ${label} token`, false, `${r.status}: ${(d.error_description ?? d.error ?? "").split("\n")[0]}`)
  log(`Outlook ${label} token`, true, `len=${d.access_token?.length ?? 0}`)

  const r2 = await fetchT(`https://graph.microsoft.com/v1.0/users/${upn}/messages?$top=1`, {
    headers: { Authorization: `Bearer ${d.access_token}` },
  })
  const d2 = await r2.json().catch(() => ({}))
  if (!r2.ok) return log(`Outlook ${label} Mail.Read on ${upn}`, false, `${r2.status}: ${d2.error?.message?.slice(0, 100) ?? r2.statusText}`)
  log(`Outlook ${label} Mail.Read on ${upn}`, true, `${d2.value?.length ?? 0} message(s)`)
}

async function main() {
  console.log("--- Airtable retries ---")
  await airtableTable("Projects")
  await sleep(800)
  await airtableTable("Day Dockets")
  await sleep(800)
  await airtableTable("Variations")
  await sleep(800)
  await airtableTable("VariationLineItems")
  await sleep(800)
  await airtableTable("Companies")

  console.log("--- Notion via v5 data_sources path ---")
  await notionDbViaSearch("NOTION_PERFORMANCE_DIARY_DB", "Performance Site Diary")
  await notionDbViaSearch("NOTION_DEFECTS_411_DB", "Defects 411")
  await notionDbViaSearch("NOTION_GENERAL_NOTES_DB", "General Notes")

  console.log("--- Outlook (try both app regs) ---")
  // App reg 1: from .env.local (Nathan's app)
  await outlook("nathanh-app", process.env.MS_CLIENT_ID, process.env.MS_CLIENT_SECRET, "nathanh@dunsteel.com.au")
  await outlook("nathanh-app", process.env.MS_CLIENT_ID, process.env.MS_CLIENT_SECRET, "admin@dunsteel.com.au")
  // App reg 2: admin@dunsteel.com.au app (set MS_CLIENT_ID_ADMIN + MS_CLIENT_SECRET_ADMIN env vars to test)
  const altCid = process.env.MS_CLIENT_ID_ADMIN
  const altSec = process.env.MS_CLIENT_SECRET_ADMIN
  if (altCid && altSec) {
    await outlook("admin-app", altCid, altSec, "nathanh@dunsteel.com.au")
    await outlook("admin-app", altCid, altSec, "admin@dunsteel.com.au")
  } else {
    console.log("  (skipping admin-app: MS_CLIENT_ID_ADMIN/SECRET not set)")
  }
}

main().catch((e) => { console.error(e); process.exit(1) })
