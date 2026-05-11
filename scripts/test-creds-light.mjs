/**
 * Lightweight credential test using only `fetch`. No SDKs that may hang.
 * Run: node --env-file=.env.local scripts/test-creds-light.mjs
 */
const results = []
const TIMEOUT = 15000

function rec(service, ok, detail) {
  results.push({ service, ok, detail })
  console.log(`${ok ? "[+] PASS" : "[-] FAIL"}  ${service.padEnd(40)} ${detail}`)
}

async function fetchT(url, opts = {}) {
  const ctrl = new AbortController()
  const t = setTimeout(() => ctrl.abort(), TIMEOUT)
  try {
    return await fetch(url, { ...opts, signal: ctrl.signal })
  } finally {
    clearTimeout(t)
  }
}

async function testAnthropic() {
  const key = process.env.ANTHROPIC_API_KEY
  if (!key) return rec("Anthropic API", false, "ANTHROPIC_API_KEY not set")
  try {
    const r = await fetchT("https://api.anthropic.com/v1/models", {
      headers: { "x-api-key": key, "anthropic-version": "2023-06-01" },
    })
    if (!r.ok) return rec("Anthropic API", false, `HTTP ${r.status}`)
    const d = await r.json()
    rec("Anthropic API", true, `${d.data?.length ?? 0} models`)
  } catch (e) { rec("Anthropic API", false, e.message) }
}

async function testNotion() {
  const key = process.env.NOTION_API_KEY
  if (!key) return rec("Notion token", false, "NOTION_API_KEY not set")
  try {
    const r = await fetchT("https://api.notion.com/v1/users/me", {
      headers: { Authorization: `Bearer ${key}`, "Notion-Version": "2025-09-03" },
    })
    if (!r.ok) return rec("Notion token", false, `HTTP ${r.status}`)
    const d = await r.json()
    rec("Notion token", true, `auth=${d.bot?.workspace_name ?? d.name ?? "?"}`)
  } catch (e) { rec("Notion token", false, e.message) }
}

async function testNotionDb(envKey, label) {
  const id = process.env[envKey]
  if (!id) return rec(`Notion: ${label}`, false, `${envKey} not set`)
  const key = process.env.NOTION_API_KEY
  try {
    // Env IDs are data_source IDs (Notion v5). Query directly.
    const r = await fetchT(`https://api.notion.com/v1/data_sources/${id}/query`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${key}`,
        "Notion-Version": "2025-09-03",
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ page_size: 1 }),
    })
    if (!r.ok) {
      const err = await r.json().catch(() => ({}))
      return rec(`Notion: ${label}`, false, `${r.status}: ${(err.message ?? r.statusText).slice(0, 100)}`)
    }
    const d = await r.json()
    rec(`Notion: ${label}`, true, `${d.results?.length ?? 0} row(s) via data_source query`)
  } catch (e) { rec(`Notion: ${label}`, false, e.message) }
}

async function testAirtable() {
  const key = process.env.AIRTABLE_API_KEY
  const base = process.env.AIRTABLE_BASE_ID
  if (!key || !base) return rec("Airtable", false, "API key or base ID not set")
  try {
    const r = await fetchT(`https://api.airtable.com/v0/${base}/Projects?maxRecords=1`, {
      headers: { Authorization: `Bearer ${key}` },
    })
    if (!r.ok) return rec("Airtable Projects", false, `HTTP ${r.status}`)
    const d = await r.json()
    rec("Airtable Projects", true, `${d.records?.length ?? 0} record(s)`)
  } catch (e) { rec("Airtable Projects", false, e.message) }
}

async function testAirtableTable(name) {
  const key = process.env.AIRTABLE_API_KEY
  const base = process.env.AIRTABLE_BASE_ID
  try {
    const r = await fetchT(`https://api.airtable.com/v0/${base}/${encodeURIComponent(name)}?maxRecords=1`, {
      headers: { Authorization: `Bearer ${key}` },
    })
    if (!r.ok) {
      const err = await r.json().catch(() => ({}))
      return rec(`Airtable: ${name}`, false, `${r.status}: ${err.error?.type ?? err.error?.message ?? r.statusText}`)
    }
    const d = await r.json()
    rec(`Airtable: ${name}`, true, `${d.records?.length ?? 0} record(s)`)
  } catch (e) { rec(`Airtable: ${name}`, false, e.message) }
}

function loadGoogleKey() {
  const b64 = process.env.GOOGLE_SERVICE_ACCOUNT_KEY_B64
  const raw = process.env.GOOGLE_SERVICE_ACCOUNT_KEY
  if (b64) return JSON.parse(Buffer.from(b64, "base64").toString("utf-8"))
  if (raw) return JSON.parse(raw)
  return null
}

let cachedGoogleToken = null
async function getGoogleToken() {
  if (cachedGoogleToken && cachedGoogleToken.exp > Date.now()) return cachedGoogleToken.token
  const key = loadGoogleKey()
  if (!key) throw new Error("GOOGLE_SERVICE_ACCOUNT_KEY(_B64) not set")
  const crypto = await import("node:crypto")
  const now = Math.floor(Date.now() / 1000)
  const claim = {
    iss: key.client_email,
    scope: "https://www.googleapis.com/auth/spreadsheets.readonly https://www.googleapis.com/auth/drive.readonly",
    aud: "https://oauth2.googleapis.com/token",
    iat: now, exp: now + 3600,
  }
  const enc = (o) => Buffer.from(JSON.stringify(o)).toString("base64url")
  const unsigned = `${enc({ alg: "RS256", typ: "JWT" })}.${enc(claim)}`
  const sig = crypto.createSign("RSA-SHA256").update(unsigned).sign(key.private_key).toString("base64url")
  const jwt = `${unsigned}.${sig}`
  const r = await fetchT("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({ grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer", assertion: jwt }),
  })
  const d = await r.json()
  if (!r.ok) throw new Error(d.error_description ?? d.error)
  cachedGoogleToken = { token: d.access_token, exp: now * 1000 + (d.expires_in - 60) * 1000 }
  return cachedGoogleToken.token
}

async function testGoogleAuth() {
  try {
    const k = loadGoogleKey()
    if (!k) return rec("Google service account", false, "GOOGLE_SERVICE_ACCOUNT_KEY_B64 not set")
    const tok = await getGoogleToken()
    rec("Google service account", true, `email=${k.client_email}, token len=${tok.length}`)
    return true
  } catch (e) { rec("Google service account", false, e.message); return false }
}

async function testMerSheet() {
  const id = process.env.GOOGLE_MER_SHEET_ID
  if (!id) return rec("MER sheet read", false, "GOOGLE_MER_SHEET_ID not set")
  try {
    const tok = await getGoogleToken()
    const r = await fetchT(
      `https://sheets.googleapis.com/v4/spreadsheets/${id}/values/A1:E5`,
      { headers: { Authorization: `Bearer ${tok}` } }
    )
    const d = await r.json()
    if (!r.ok) {
      const code = d.error?.status ?? r.status
      const msg = d.error?.message ?? "unknown"
      if (msg.includes("does not have permission") || msg.includes("PERMISSION_DENIED")) {
        return rec("MER sheet read", false, "service account NOT shared on the sheet")
      }
      return rec("MER sheet read", false, `${code}: ${msg}`)
    }
    rec("MER sheet read", true, `${d.values?.length ?? 0} rows in A1:E5`)
  } catch (e) { rec("MER sheet read", false, e.message) }
}

async function testN8n() {
  const url = process.env.N8N_BASE_URL
  const key = process.env.N8N_API_KEY_DUNSTEEL ?? process.env.N8N_API_KEY
  if (!url || !key) return rec("n8n API", false, "N8N_BASE_URL or N8N_API_KEY_DUNSTEEL missing")
  try {
    const r = await fetchT(`${url.replace(/\/+$/, "")}/api/v1/workflows?limit=5`, {
      headers: { "X-N8N-API-KEY": key, Accept: "application/json" },
    })
    if (!r.ok) return rec("n8n API", false, `HTTP ${r.status}`)
    const d = await r.json()
    rec("n8n API", true, `${d.data?.length ?? 0} workflow(s) visible (sample)`)
  } catch (e) { rec("n8n API", false, e.message) }
}

async function testMonday() {
  const key = process.env.MONDAY_API_KEY
  if (!key) return rec("Monday API", false, "MONDAY_API_KEY not set")
  try {
    const r = await fetchT("https://api.monday.com/v2", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: key, "API-Version": "2024-10" },
      body: JSON.stringify({ query: "query { me { id name email } }" }),
    })
    const d = await r.json()
    if (d.errors) return rec("Monday API", false, d.errors[0].message)
    rec("Monday API", true, `me=${d.data?.me?.name} <${d.data?.me?.email}>`)
  } catch (e) { rec("Monday API", false, e.message) }
}

async function testOutlookToken() {
  const tid = process.env.MS_TENANT_ID
  const cid = process.env.MS_CLIENT_ID
  const sec = process.env.MS_CLIENT_SECRET
  if (!tid || !cid || !sec) return rec("Outlook MS Graph token", false, "MS_TENANT_ID/CLIENT_ID/SECRET missing")
  try {
    const r = await fetchT(`https://login.microsoftonline.com/${tid}/oauth2/v2.0/token`, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        grant_type: "client_credentials", client_id: cid, client_secret: sec,
        scope: "https://graph.microsoft.com/.default",
      }),
    })
    const d = await r.json()
    if (!r.ok) return rec("Outlook MS Graph token", false, `${r.status}: ${d.error_description?.split("\n")[0] ?? d.error}`)
    rec("Outlook MS Graph token", true, `token len=${d.access_token?.length ?? 0}`)
    // Mail.Read test
    const upn = process.env.OUTLOOK_USER_PRINCIPAL_NAME ?? "nathanh@dunsteel.com.au"
    const r2 = await fetchT(`https://graph.microsoft.com/v1.0/users/${upn}/messages?$top=1`, {
      headers: { Authorization: `Bearer ${d.access_token}` },
    })
    const d2 = await r2.json().catch(() => ({}))
    if (!r2.ok) {
      return rec("Outlook Mail.Read", false, `${r2.status}: ${d2.error?.message?.split("\n")[0] ?? r2.statusText}`)
    }
    rec("Outlook Mail.Read", true, `${d2.value?.length ?? 0} message(s) accessible (top 1)`)
  } catch (e) { rec("Outlook MS Graph token", false, e.message) }
}

async function main() {
  console.log("Testing AIOS credentials\n")
  await testAnthropic()
  await testNotion()
  await testAirtable()
  await testAirtableTable("Day Dockets")
  await testAirtableTable("Variations")
  await testAirtableTable("VariationLineItems")
  console.log("--- Notion DBs ---")
  await testNotionDb("NOTION_PERFORMANCE_DIARY_DB", "Performance Site Diary")
  await testNotionDb("NOTION_SUBCON_DIARY_DB", "Subcontractors Diary")
  await testNotionDb("NOTION_VOICE_MEMO_LOG_DB", "Voice Memo Log")
  await testNotionDb("NOTION_DEFECTS_411_DB", "Defects 411")
  await testNotionDb("NOTION_GENERAL_NOTES_DB", "General Notes")
  await testNotionDb("NOTION_PROJECTS_DB", "Projects (Hub)")
  console.log("--- Google ---")
  if (await testGoogleAuth()) await testMerSheet()
  console.log("--- n8n / Monday / Outlook ---")
  await testN8n()
  await testMonday()
  await testOutlookToken()

  const ok = results.filter(r => r.ok).length
  console.log(`\n${ok}/${results.length} checks passed`)
  if (ok < results.length) {
    console.log("\nFailures:")
    for (const r of results.filter(r => !r.ok)) console.log(`  - ${r.service}: ${r.detail}`)
  }
}

main().catch(e => { console.error(e); process.exit(1) })
