#!/usr/bin/env node
/**
 * Run all SQL files in db/migrations/ in lexical order against POSTGRES_URL.
 *
 * Usage:
 *   POSTGRES_URL=postgres://... node scripts/migrate.mjs
 *
 * Idempotent: each migration uses `create table if not exists`. Run as
 * many times as you like.
 */

import { readdirSync, readFileSync } from "node:fs"
import { dirname, join } from "node:path"
import { fileURLToPath } from "node:url"
import postgres from "postgres"

const __dirname = dirname(fileURLToPath(import.meta.url))
const MIGRATIONS_DIR = join(__dirname, "..", "db", "migrations")

async function main() {
  const url = process.env.POSTGRES_URL ?? process.env.DATABASE_URL
  if (!url) {
    console.error("POSTGRES_URL not set")
    process.exit(1)
  }
  const sql = postgres(url, { ssl: "require", max: 1 })
  try {
    const files = readdirSync(MIGRATIONS_DIR)
      .filter((f) => f.endsWith(".sql"))
      .sort()
    for (const file of files) {
      console.log(`> ${file}`)
      const text = readFileSync(join(MIGRATIONS_DIR, file), "utf8")
      await sql.unsafe(text)
    }
    console.log("done.")
  } finally {
    await sql.end()
  }
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
