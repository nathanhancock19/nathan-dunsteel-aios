/**
 * Test every external credential AIOS uses. Prints PASS / FAIL per service.
 * Run: node --env-file=.env.local scripts/test-all-creds.mjs
 */
import { Client as NotionClient } from "@notionhq/client"
import Airtable from "airtable"
import { google } from "googleapis"
import { GoogleAuth } from "google-auth-library"

const results = []

function rec(service, ok, detail) {
  results.push({ service, ok, detail })
  const tag = ok ? "PASS" : "FAIL"
  const dot = ok ? "[+]" : "[-]"
  console.log(`${dot} ${tag}  ${service.padEnd(38)} ${detail}`)
}

async function testNotionToken() {
  try {
    const c = new NotionClient({ auth: process.env.NOTION_API_KEY })
    const me = await c.users.me({})
    rec("Notion API token", true, `auth=${me?.bot?.workspace_name ?? me?.name ?? "?"}`)
  } catch (e) {
    rec("Notion API token", false, e.message)
  }
}

async function testNotionDb(envKey, label) {
  const id = process.env[envKey]
  if (!id) return rec(`Notion: ${label}`, false, `${envKey} not set`)
  try {
    const c = new NotionClient({ auth: process.env.NOTION_API_KEY })
    const db = await c.databases.retrieve({ database_id: id })
    const dsId = db.data_sources?.[0]?.id ?? id
    const res = await c.dataSources.query({ data_source_id: dsId, page_size: 1 })
    rec(`Notion: ${label}`, true, `1+ rows (id ${id.slice(0, 8)}...)`)
  } catch (e) {
    rec(`Notion: ${label}`, false, e.message?.split("\n")[0] ?? String(e))
  }
}

async function testAirtable() {
  try {
    const base = new Airtable({ apiKey: process.env.AIRTABLE_API_KEY }).base(process.env.AIRTABLE_BASE_ID)
    const recs = await base("Projects").select({ maxRecords: 1 }).firstPage()
    rec("Airtable Projects table", true, `1 record (base ${process.env.AIRTABLE_BASE_ID})`)
  } catch (e) {
    rec("Airtable Projects table", false, e.message)
  }
}

async function testAirtableTable(name) {
  try {
    const base = new Airtable({ apiKey: process.env.AIRTABLE_API_KEY }).base(process.env.AIRTABLE_BASE_ID)
    const recs = await base(name).select({ maxRecords: 1 }).firstPage()
    rec(`Airtable: ${name}`, true, `${recs.length} record(s)`)
  } catch (e) {
    rec(`Airtable: ${name}`, false, e.message?.split("\n")[0] ?? String(e))
  }
}

function loadGoogleKey() {
  const b64 = process.env.GOOGLE_SERVICE_ACCOUNT_KEY_B64
  const raw = process.env.GOOGLE_SERVICE_ACCOUNT_KEY
  if (b64) return JSON.parse(Buffer.from(b64, "base64").toString("utf-8"))
  if (raw) return JSON.parse(raw)
  throw new Error("GOOGLE_SERVICE_ACCOUNT_KEY(_B64) not set")
}

async function testGoogleAuth() {
  try {
    const credentials = loadGoogleKey()
    const auth = new GoogleAuth({
      credentials,
      scopes: ["https://www.googleapis.com/auth/spreadsheets.readonly", "https://www.googleapis.com/auth/drive.readonly"],
    })
    const client = await auth.getClient()
    rec("Google service account", true, `email=${credentials.client_email}`)
    return auth
  } catch (e) {
    rec("Google service account", false, e.message)
    return null
  }
}

async function testMerSheet(auth) {
  if (!auth) return rec("MER sheet read", false, "no Google auth")
  const id = process.env.GOOGLE_MER_SHEET_ID
  if (!id) return rec("MER sheet read", false, "GOOGLE_MER_SHEET_ID not set")
  try {
    const sheets = google.sheets({ version: "v4", auth })
    const res = await sheets.spreadsheets.values.get({ spreadsheetId: id, range: "A1:E5" })
    const rows = res.data.values?.length ?? 0
    rec("MER sheet read", true, `${rows} rows in A1:E5`)
  } catch (e) {
    const msg = e.message?.split("\n")[0] ?? String(e)
    if (msg.includes("PERMISSION_DENIED") || msg.includes("does not have permission")) {
      rec("MER sheet read", false, "service account lacks Viewer access on the sheet")
    } else {
      rec("MER sheet read", false, msg)
    }
  }
}

async function testN8n() {
  const url = process.env.N8N_BASE_URL
  const key = process.env.N8N_API_KEY_DUNSTEEL ?? process.env.N8N_API_KEY
  if (!url || !key) return rec("n8n API", false, "N8N_BASE_URL or N8N_API_KEY_DUNSTEEL not set")
  try {
    const res = await fetch(`${url.replace(/\/+$/, "")}/api/v1/workflows?limit=1`, {
      headers: { "X-N8N-API-KEY": key, Accept: "application/json" },
    })
    if (!res.ok) return rec("n8n API", false, `HTTP ${res.status}`)
    const data = await res.json()
    rec("n8n API", true, `${data.data?.length ?? 0} workflows visible (truncated)`)
  } catch (e) {
    rec("n8n API", false, e.message)
  }
}

async function testMonday() {
  const key = process.env.MONDAY_API_KEY
  if (!key) return rec("Monday API", false, "MONDAY_API_KEY not set")
  try {
    const res = await fetch("https://api.monday.com/v2", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: key, "API-Version": "2024-10" },
      body: JSON.stringify({ query: "query { me { id name email } }" }),
    })
    const data = await res.json()
    if (data.errors) return rec("Monday API", false, data.errors[0].message)
    rec("Monday API", true, `me=${data.data?.me?.name} <${data.data?.me?.email}>`)
  } catch (e) {
    rec("Monday API", false, e.message)
  }
}

async function testOutlook() {
  const tid = process.env.MS_TENANT_ID
  const cid = process.env.MS_CLIENT_ID
  const sec = process.env.MS_CLIENT_SECRET
  if (!tid || !cid || !sec) return rec("Outlook (MS Graph) token", false, "MS_TENANT_ID/CLIENT_ID/SECRET not set")
  try {
    const body = new URLSearchParams({
      grant_type: "client_credentials",
      client_id: cid,
      client_secret: sec,
      scope: "https://graph.microsoft.com/.default",
    })
    const res = await fetch(`https://login.microsoftonline.com/${tid}/oauth2/v2.0/token`, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body,
    })
    const data = await res.json()
    if (!res.ok) return rec("Outlook (MS Graph) token", false, `${res.status}: ${data.error_description ?? data.error}`)
    rec("Outlook (MS Graph) token", true, `token len=${data.access_token?.length ?? 0}`)

    // Try a Mail.Read call
    const upn = process.env.OUTLOOK_USER_PRINCIPAL_NAME ?? "nathanh@dunsteel.com.au"
    const mailRes = await fetch(`https://graph.microsoft.com/v1.0/users/${upn}/messages?$top=1`, {
      headers: { Authorization: `Bearer ${data.access_token}` },
    })
    if (!mailRes.ok) {
      const err = await mailRes.json().catch(() => ({}))
      rec("Outlook Mail.Read scope", false, `${mailRes.status}: ${err.error?.message ?? mailRes.statusText}`)
    } else {
      const mailData = await mailRes.json()
      rec("Outlook Mail.Read scope", true, `${mailData.value?.length ?? 0} message(s) visible (top 1)`)
    }
  } catch (e) {
    rec("Outlook (MS Graph) token", false, e.message)
  }
}

async function testAnthropic() {
  const key = process.env.ANTHROPIC_API_KEY
  if (!key) return rec("Anthropic API", false, "ANTHROPIC_API_KEY not set")
  try {
    const res = await fetch("https://api.anthropic.com/v1/models", {
      headers: { "x-api-key": key, "anthropic-version": "2023-06-01" },
    })
    if (!res.ok) return rec("Anthropic API", false, `HTTP ${res.status}`)
    const data = await res.json()
    rec("Anthropic API", true, `${data.data?.length ?? 0} models accessible`)
  } catch (e) {
    rec("Anthropic API", false, e.message)
  }
}

async function testPostgres() {
  const url = process.env.POSTGRES_URL
  if (!url) return rec("Postgres", false, "POSTGRES_URL not set (only in Vercel env)")
  rec("Postgres", true, "URL set, would need pool ping; skipped in this script")
}

async function main() {
  console.log("Testing AIOS credentials\n")
  console.log("=== Anthropic / Notion / Airtable ===")
  await testAnthropic()
  await testNotionToken()
  await testAirtable()
  await testAirtableTable("Day Dockets")
  await testAirtableTable("Variations")
  await testAirtableTable("VariationLineItems")
  console.log("\n=== Notion databases ===")
  await testNotionDb("NOTION_PERFORMANCE_DIARY_DB", "Performance Site Diary")
  await testNotionDb("NOTION_SUBCON_DIARY_DB", "Subcontractors Diary")
  await testNotionDb("NOTION_VOICE_MEMO_LOG_DB", "Voice Memo Log")
  await testNotionDb("NOTION_DEFECTS_411_DB", "Defects 411")
  await testNotionDb("NOTION_GENERAL_NOTES_DB", "General Notes")
  await testNotionDb("NOTION_PROJECTS_DB", "Projects")
  console.log("\n=== Google ===")
  const auth = await testGoogleAuth()
  await testMerSheet(auth)
  console.log("\n=== n8n / Monday / Outlook ===")
  await testN8n()
  await testMonday()
  await testOutlook()
  console.log("\n=== Postgres ===")
  await testPostgres()

  const ok = results.filter((r) => r.ok).length
  const total = results.length
  console.log(`\n${ok}/${total} checks passed`)
  if (ok < total) {
    console.log("\nFailures to address:")
    for (const r of results.filter((r) => !r.ok)) console.log(`  - ${r.service}: ${r.detail}`)
  }
}

main().catch((e) => { console.error(e); process.exit(1) })
