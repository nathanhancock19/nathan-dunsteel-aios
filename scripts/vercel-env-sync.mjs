/**
 * Sync env vars from AIOS .env.local to Vercel Production for this project.
 *
 * Reads VERCEL_TOKEN from env (or arg 1).
 * Reads .env.local from this project root.
 *
 * For each var:
 *  - skip if in SKIP set or value is empty
 *  - if exists with same value: log "unchanged"
 *  - if exists with different value: PATCH
 *  - if doesn't exist: POST
 */
import fs from "node:fs"

const TOKEN = process.env.VERCEL_TOKEN ?? process.argv[2]
if (!TOKEN) { console.error("Set VERCEL_TOKEN env"); process.exit(1) }

const ENV_FILE = "C:/Users/nathanh/nathan-dunsteel-aios/.env.local"
const PROJECT_NAME = "nathan-dunsteel-aios"
const TEAM_ID = "team_PMXZwQwK89b4MERXdUM9EfW7"

const SKIP = new Set([
  "NEXTAUTH_URL",     // Vercel URL set automatically
  "POSTGRES_URL",     // From Vercel Postgres integration
  "VERCEL_TOKEN",
  "VERCEL_API_KEY",
])

async function vapi(path, opts = {}) {
  const sep = path.includes("?") ? "&" : "?"
  const url = `https://api.vercel.com${path}${sep}teamId=${TEAM_ID}`
  const res = await fetch(url, {
    ...opts,
    headers: {
      ...(opts.headers ?? {}),
      Authorization: `Bearer ${TOKEN}`,
      "Content-Type": "application/json",
    },
  })
  const text = await res.text()
  let body
  try { body = JSON.parse(text) } catch { body = text }
  if (!res.ok) throw new Error(`${opts.method ?? "GET"} ${path} HTTP ${res.status}: ${typeof body === "string" ? body.slice(0, 200) : JSON.stringify(body).slice(0, 200)}`)
  return body
}

function parseEnvFile(path) {
  const raw = fs.readFileSync(path, "utf-8")
  const out = {}
  let key = null, buf = "", depth = 0
  const lines = raw.split(/\r?\n/)
  for (const line of lines) {
    if (key) {
      buf += "\n" + line
      depth += (line.match(/\{/g) ?? []).length
      depth -= (line.match(/\}/g) ?? []).length
      if (depth <= 0) { out[key] = buf.trim(); key = null; buf = "" }
      continue
    }
    if (!line || line.trimStart().startsWith("#")) continue
    const eq = line.indexOf("=")
    if (eq < 0) continue
    const k = line.slice(0, eq).trim()
    const v = line.slice(eq + 1)
    if (!/^[A-Z_][A-Z0-9_]*$/.test(k)) continue
    if (v.trimStart().startsWith("{")) {
      key = k; buf = v
      depth = (v.match(/\{/g) ?? []).length - (v.match(/\}/g) ?? []).length
      if (depth <= 0) { out[k] = v.trim(); key = null; buf = "" }
      continue
    }
    out[k] = v
  }
  return out
}

async function main() {
  console.log(`Project: ${PROJECT_NAME}`)
  console.log(`Source : ${ENV_FILE}\n`)

  const project = await vapi(`/v9/projects/${PROJECT_NAME}`)
  if (!project?.id) { console.error(`Project '${PROJECT_NAME}' not found`); process.exit(2) }
  console.log(`Project ID: ${project.id}`)
  if (project.accountId) console.log(`Account ID: ${project.accountId}`)

  const existing = await vapi(`/v9/projects/${project.id}/env?decrypt=true`)
  const byKey = new Map()
  for (const e of existing.envs ?? []) {
    if ((e.target ?? []).includes("production")) byKey.set(e.key, e)
  }
  console.log(`Existing production env vars: ${byKey.size}\n`)

  const local = parseEnvFile(ENV_FILE)
  console.log(`Local env vars: ${Object.keys(local).length}\n`)

  let created = 0, updated = 0, unchanged = 0, skipped = 0, errors = 0
  for (const [k, raw] of Object.entries(local)) {
    if (SKIP.has(k)) { console.log(`  - ${k} (skipped, internal)`); skipped++; continue }
    const v = raw.trim()
    if (!v) { console.log(`  - ${k} (skipped, empty)`); skipped++; continue }
    const ex = byKey.get(k)
    try {
      if (!ex) {
        await vapi(`/v10/projects/${project.id}/env?upsert=true`, {
          method: "POST",
          body: JSON.stringify({
            key: k,
            value: v,
            target: ["production", "preview"],
            type: "encrypted",
          }),
        })
        console.log(`  + ${k} (created)`)
        created++
      } else if (ex.value === v) {
        console.log(`  = ${k} (unchanged)`)
        unchanged++
      } else {
        await vapi(`/v9/projects/${project.id}/env/${ex.id}`, {
          method: "PATCH",
          body: JSON.stringify({ value: v }),
        })
        console.log(`  ~ ${k} (updated)`)
        updated++
      }
    } catch (e) {
      console.log(`  ! ${k} ERROR: ${e.message?.slice(0, 200)}`)
      errors++
    }
  }

  console.log(`\nSummary: ${created} created, ${updated} updated, ${unchanged} unchanged, ${skipped} skipped, ${errors} errors`)
  if (errors > 0) process.exit(3)
}

main().catch((e) => { console.error(e); process.exit(1) })
