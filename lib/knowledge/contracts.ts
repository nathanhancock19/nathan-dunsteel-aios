/**
 * Read-side helpers for the `knowledge_docs` table.
 *
 * Writes are performed by external ingest scripts (see
 * workspace `scripts/aios_ingest_contract.py`). The AIOS app itself does
 * not write contract content into Postgres — the network share holding
 * the source PDF is never reachable from Vercel.
 */

import { getDb } from "@/lib/db/postgres"

export type ContractClauseHit = {
  key: string
  value: string
}

export type ContractClausesResult = {
  projectNumber: string
  title: string | null
  ingestedAt: string | null
  updatedAt: string | null
  available: string[]
  matches: ContractClauseHit[]
}

export type ContractFullResult = {
  projectNumber: string
  title: string | null
  ingestedAt: string | null
  updatedAt: string | null
  contentMd: string
  truncated: boolean
}

type ContractRow = {
  title: string
  content_md: string
  clauses_json: Record<string, unknown> | null
  ingested_at: Date | null
  updated_at: Date | null
}

async function loadContract(projectNumber: string): Promise<ContractRow | null> {
  const db = getDb()
  if (!db) return null
  const rows = await db<ContractRow[]>`
    select title, content_md, clauses_json, ingested_at, updated_at
    from knowledge_docs
    where project_number = ${projectNumber}
      and doc_type = 'contract'
    order by updated_at desc
    limit 1
  `
  return rows[0] ?? null
}

function flattenClauses(clauses: Record<string, unknown>): ContractClauseHit[] {
  const out: ContractClauseHit[] = []
  for (const [key, value] of Object.entries(clauses)) {
    out.push({ key, value: stringifyValue(value) })
  }
  return out
}

function stringifyValue(value: unknown): string {
  if (value == null) return ""
  if (typeof value === "string") return value
  if (typeof value === "number" || typeof value === "boolean") return String(value)
  if (Array.isArray(value)) {
    return value.map((v) => `- ${stringifyValue(v)}`).join("\n")
  }
  if (typeof value === "object") return JSON.stringify(value, null, 2)
  return String(value)
}

/**
 * Query structured contract clauses for a project. If `topic` is supplied,
 * filters to clauses whose key or value matches (case-insensitive).
 */
export async function queryContractClauses(
  projectNumber: string,
  topic?: string,
): Promise<ContractClausesResult> {
  const row = await loadContract(projectNumber)
  if (!row) {
    return {
      projectNumber,
      title: null,
      ingestedAt: null,
      updatedAt: null,
      available: [],
      matches: [],
    }
  }
  const flat = row.clauses_json ? flattenClauses(row.clauses_json) : []
  const available = flat.map((c) => c.key)
  const needle = topic?.trim().toLowerCase() ?? ""
  const matches = needle
    ? flat.filter(
        (c) =>
          c.key.toLowerCase().includes(needle) ||
          c.value.toLowerCase().includes(needle),
      )
    : flat
  return {
    projectNumber,
    title: row.title,
    ingestedAt: row.ingested_at?.toISOString() ?? null,
    updatedAt: row.updated_at?.toISOString() ?? null,
    available,
    matches,
  }
}

/**
 * Return the full markdown body of the project's contract, capped to
 * maxChars. truncated=true if content was clipped.
 */
export async function queryContractFull(
  projectNumber: string,
  maxChars = 8000,
): Promise<ContractFullResult> {
  const row = await loadContract(projectNumber)
  if (!row) {
    return {
      projectNumber,
      title: null,
      ingestedAt: null,
      updatedAt: null,
      contentMd: "",
      truncated: false,
    }
  }
  const truncated = row.content_md.length > maxChars
  const body = truncated ? row.content_md.slice(0, maxChars) : row.content_md
  return {
    projectNumber,
    title: row.title,
    ingestedAt: row.ingested_at?.toISOString() ?? null,
    updatedAt: row.updated_at?.toISOString() ?? null,
    contentMd: body,
    truncated,
  }
}
