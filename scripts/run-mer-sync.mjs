/**
 * Standalone MER sync script - runs outside Next.js.
 * Usage: node scripts/run-mer-sync.mjs
 */
import { readFileSync } from "fs"
import { google } from "googleapis"
import postgres from "postgres"

// Load .env.local
const envFile = readFileSync(new URL("../.env.local", import.meta.url), "utf8")
for (const line of envFile.split("\n")) {
  const m = line.match(/^([^#=\s][^=]*)=(.*)$/)
  if (m) process.env[m[1].trim()] = m[2].trim()
}

const MONTH_NAMES = {
  january: 1, february: 2, march: 3, april: 4, may: 5, june: 6,
  july: 7, august: 8, september: 9, october: 10, november: 11, december: 12,
}

function parseAmount(raw) {
  if (raw == null) return null
  const s = String(raw).trim()
  if (!s || s === "-" || s.includes("#")) return null
  const cleaned = s.replace(/[$,\s]/g, "").replace(/%$/, "")
  const n = parseFloat(cleaned)
  return Number.isFinite(n) ? n : null
}

function parsePercent(raw) {
  if (raw == null) return null
  const s = String(raw).trim()
  if (!s || s === "-" || s.includes("#")) return null
  const hadPct = s.endsWith("%")
  const cleaned = s.replace(/[%\s]/g, "")
  const n = parseFloat(cleaned)
  if (!Number.isFinite(n)) return null
  if (hadPct) return n / 100
  if (n > 1) return n / 100
  return n
}

function parseProjectLabel(label) {
  const trimmed = label.trim()
  if (!trimmed) return null
  const m = trimmed.match(/^(\d{3,4})\b/)
  if (m) return m[1]
  if (trimmed.toLowerCase() === "syd2") return "411"
  return null
}

function parseMonthBlocks(monthRow) {
  const blocks = []
  let year = Number(process.env.MER_START_YEAR ?? 2024)
  let lastMonth = 0
  const monthCols = []
  for (let i = 3; i < monthRow.length; i++) {
    const label = String(monthRow[i] ?? "").trim().toLowerCase()
    if (label && MONTH_NAMES[label]) monthCols.push({ col: i, month: MONTH_NAMES[label] })
  }
  for (const m of monthCols) {
    if (m.month < lastMonth) year++
    lastMonth = m.month
    const yearMonth = `${year}-${String(m.month).padStart(2, "0")}`
    const blockStart = m.col + 2
    blocks.push({ yearMonth, pctCol: blockStart, dollarCol: blockStart + 1, remainCol: blockStart + 2, cumCol: blockStart + 3 })
  }
  return blocks
}

function parseDataRows(rows, blocks) {
  const scopes = [], claims = []
  let currentProjectLabel = "", currentProjectNumber = null
  for (let r = 3; r < rows.length; r++) {
    const row = rows[r] ?? []
    const job = String(row[0] ?? "").trim()
    const scope = String(row[1] ?? "").trim()
    const scopeValueRaw = row[2]
    if (job && !scope && (!scopeValueRaw || parseAmount(scopeValueRaw) == null)) {
      currentProjectLabel = job
      currentProjectNumber = parseProjectLabel(job)
      continue
    }
    if (!job && !scope) continue
    if (/^total/i.test(job) || /^total/i.test(scope)) continue
    if (/template|copy this|placeholder/i.test(scope) || /template|copy this/i.test(job)) continue
    if (!currentProjectNumber || !scope) continue
    const isVariation = /^V\d{1,3}$/i.test(scope) || /^V\d{1,3}$/i.test(job) || /variation/i.test(scope)
    const id = `${currentProjectNumber}::${scope}`
    scopes.push({ id, projectNumber: currentProjectNumber, projectLabel: currentProjectLabel, jobIndex: job || null, scopeName: scope, scopeValue: parseAmount(row[2]), remainingValue: parseAmount(row[3]), claimedPct: parsePercent(row[4]), isVariation })
    for (const b of blocks) {
      const thisMonthPct = parsePercent(row[b.pctCol])
      const thisMonthValue = parseAmount(row[b.dollarCol])
      const remaining = parseAmount(row[b.remainCol])
      if (thisMonthPct == null && remaining == null && thisMonthValue == null) continue
      claims.push({ id: `${currentProjectNumber}::${scope}::${b.yearMonth}`, projectNumber: currentProjectNumber, scopeName: scope, yearMonth: b.yearMonth, remainingValue: remaining, claimedPct: thisMonthPct, thisMonthValue })
    }
  }
  return { scopes, claims }
}

async function main() {
  console.log("Fetching MER sheet...")
  const sheetId = process.env.GOOGLE_MER_SHEET_ID
  const tab = process.env.GOOGLE_MER_TAB ?? "Sheet1"
  if (!sheetId) throw new Error("GOOGLE_MER_SHEET_ID not set")

  const rawKey = process.env.GOOGLE_SERVICE_ACCOUNT_KEY_B64
    ? Buffer.from(process.env.GOOGLE_SERVICE_ACCOUNT_KEY_B64, "base64").toString("utf-8")
    : process.env.GOOGLE_SERVICE_ACCOUNT_KEY
  if (!rawKey) throw new Error("GOOGLE_SERVICE_ACCOUNT_KEY or _B64 not set")
  const serviceAccountKey = JSON.parse(rawKey)
  const auth = new google.auth.GoogleAuth({
    credentials: serviceAccountKey,
    scopes: ["https://www.googleapis.com/auth/spreadsheets.readonly"],
  })

  const sheets = google.sheets({ version: "v4", auth })
  const res = await sheets.spreadsheets.values.get({
    spreadsheetId: sheetId,
    range: `${tab}!A1:CN200`,
    valueRenderOption: "FORMATTED_VALUE",
  })
  const rows = res.data.values ?? []
  if (!rows.length) { console.log("Sheet is empty"); return }

  const blocks = parseMonthBlocks(rows[1] ?? [])
  const { scopes, claims } = parseDataRows(rows, blocks)
  console.log(`Parsed: ${scopes.length} scopes, ${claims.length} claims, months: ${blocks.map(b => b.yearMonth).join(", ")}`)

  const db = postgres(process.env.POSTGRES_URL, { ssl: "require" })

  for (const s of scopes) {
    await db`
      insert into mer_scopes (id, project_number, project_label, job_index, scope_name, scope_value, remaining_value, claimed_pct, is_variation, synced_at)
      values (${s.id}, ${s.projectNumber}, ${s.projectLabel}, ${s.jobIndex ?? null}, ${s.scopeName},
              ${s.scopeValue}, ${s.remainingValue}, ${s.claimedPct}, ${s.isVariation}, now())
      on conflict (id) do update set
        project_label = excluded.project_label,
        job_index = excluded.job_index,
        scope_value = excluded.scope_value,
        remaining_value = excluded.remaining_value,
        claimed_pct = excluded.claimed_pct,
        is_variation = excluded.is_variation,
        synced_at = excluded.synced_at
    `
  }
  console.log("Scopes upserted")

  for (const c of claims) {
    await db`
      insert into mer_claims (id, project_number, scope_name, year_month, remaining_value, claimed_pct, this_month_value, synced_at)
      values (${c.id}, ${c.projectNumber}, ${c.scopeName}, ${c.yearMonth},
              ${c.remainingValue}, ${c.claimedPct}, ${c.thisMonthValue ?? null}, now())
      on conflict (id) do update set
        remaining_value = excluded.remaining_value,
        claimed_pct = excluded.claimed_pct,
        this_month_value = excluded.this_month_value,
        synced_at = excluded.synced_at
    `
  }
  console.log("Claims upserted")

  await db`
    update mer_sync_state
    set last_synced_at = now(), last_scope_count = ${scopes.length},
        last_claim_count = ${claims.length}, last_error = null
    where id = 1
  `
  console.log("Sync state updated. Done.")
  await db.end()
}

main().catch(e => { console.error("Error:", e.message); process.exit(1) })
