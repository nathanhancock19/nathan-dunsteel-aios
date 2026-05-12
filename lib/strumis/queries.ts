/**
 * MER (and future Strumis) read-side query helpers.
 *
 * Strumis queries are stubs for now (file kept here for shape; live data
 * lands when boss approves Strumis access). MER queries are live.
 *
 * All queries scoped to AIOS_PRIMARY_PROJECT_NUMBER unless caller overrides.
 */
import { getDb } from "@/lib/db/postgres"

const project = () => process.env.AIOS_PRIMARY_PROJECT_NUMBER ?? "411"

export type MerScopeRow = {
  scopeName: string
  jobIndex: string | null
  scopeValue: number | null
  remainingValue: number | null
  claimedPct: number | null
  isVariation: boolean
}

export type MerClaimRow = {
  scopeName: string
  yearMonth: string
  remainingValue: number | null
  claimedPct: number | null
  thisMonthValue: number | null
}

export type MerSyncStatus = {
  lastSyncedAt: string | null
  lastScopeCount: number | null
  lastClaimCount: number | null
  lastError: string | null
  ageHours: number | null
}

export async function getMerScopes(projectNumber?: string): Promise<MerScopeRow[]> {
  const db = getDb()
  if (!db) return []
  const p = projectNumber ?? project()
  const rows = await db<
    Array<{
      scope_name: string
      job_index: string | null
      scope_value: string | null
      remaining_value: string | null
      claimed_pct: string | null
      is_variation: boolean
    }>
  >`
    select scope_name, job_index, scope_value, remaining_value, claimed_pct, is_variation
    from mer_scopes
    where project_number = ${p}
    order by is_variation, scope_name
  `
  return rows.map((r) => ({
    scopeName: r.scope_name,
    jobIndex: r.job_index ?? null,
    scopeValue: r.scope_value == null ? null : Number(r.scope_value),
    remainingValue: r.remaining_value == null ? null : Number(r.remaining_value),
    claimedPct: r.claimed_pct == null ? null : Number(r.claimed_pct),
    isVariation: r.is_variation,
  }))
}

export async function getMerClaimsSchedule(projectNumber?: string): Promise<MerClaimRow[]> {
  const db = getDb()
  if (!db) return []
  const p = projectNumber ?? project()
  const rows = await db<
    Array<{
      scope_name: string
      year_month: string
      remaining_value: string | null
      claimed_pct: string | null
      this_month_value: string | null
    }>
  >`
    select scope_name, year_month, remaining_value, claimed_pct, this_month_value
    from mer_claims
    where project_number = ${p}
    order by year_month, scope_name
  `
  return rows.map((r) => ({
    scopeName: r.scope_name,
    yearMonth: r.year_month,
    remainingValue: r.remaining_value == null ? null : Number(r.remaining_value),
    claimedPct: r.claimed_pct == null ? null : Number(r.claimed_pct),
    thisMonthValue: r.this_month_value == null ? null : Number(r.this_month_value),
  }))
}

export async function getMerClaimsForMonth(
  yearMonth: string,
  projectNumber?: string,
): Promise<MerClaimRow[]> {
  const db = getDb()
  if (!db) return []
  const p = projectNumber ?? project()
  const rows = await db<
    Array<{
      scope_name: string
      year_month: string
      remaining_value: string | null
      claimed_pct: string | null
      this_month_value: string | null
    }>
  >`
    select scope_name, year_month, remaining_value, claimed_pct, this_month_value
    from mer_claims
    where project_number = ${p}
      and year_month = ${yearMonth}
    order by scope_name
  `
  return rows.map((r) => ({
    scopeName: r.scope_name,
    yearMonth: r.year_month,
    remainingValue: r.remaining_value == null ? null : Number(r.remaining_value),
    claimedPct: r.claimed_pct == null ? null : Number(r.claimed_pct),
    thisMonthValue: r.this_month_value == null ? null : Number(r.this_month_value),
  }))
}

export async function getMerSyncStatus(): Promise<MerSyncStatus> {
  const db = getDb()
  if (!db) return { lastSyncedAt: null, lastScopeCount: null, lastClaimCount: null, lastError: "POSTGRES_URL not set", ageHours: null }
  const rows = await db<
    Array<{
      last_synced_at: Date | null
      last_scope_count: number | null
      last_claim_count: number | null
      last_error: string | null
    }>
  >`select last_synced_at, last_scope_count, last_claim_count, last_error from mer_sync_state where id = 1`
  const r = rows[0]
  if (!r) return { lastSyncedAt: null, lastScopeCount: null, lastClaimCount: null, lastError: null, ageHours: null }
  const ageHours = r.last_synced_at
    ? Math.round((Date.now() - r.last_synced_at.getTime()) / 36e5 * 10) / 10
    : null
  return {
    lastSyncedAt: r.last_synced_at?.toISOString() ?? null,
    lastScopeCount: r.last_scope_count,
    lastClaimCount: r.last_claim_count,
    lastError: r.last_error,
    ageHours,
  }
}

/**
 * Summary card data for dashboard tile.
 */
export type MerSummary = {
  projectNumber: string
  totalScopeValue: number
  totalRemainingValue: number
  overallClaimedPct: number  // weighted by scope value
  variationsCount: number
  variationsValue: number
  thisMonthClaimedValue: number
  thisMonthYearMonth: string
}

function thisMonthYearMonth(): string {
  const d = new Date()
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}`
}

export async function getMerSummary(projectNumber?: string): Promise<MerSummary> {
  const p = projectNumber ?? project()
  const scopes = await getMerScopes(p)
  const ym = thisMonthYearMonth()
  const monthClaims = await getMerClaimsForMonth(ym, p)

  const totalScopeValue = scopes.reduce((sum, s) => sum + (s.scopeValue ?? 0), 0)
  const totalRemainingValue = scopes.reduce((sum, s) => sum + (s.remainingValue ?? 0), 0)
  const overallClaimedPct =
    totalScopeValue > 0 ? Math.max(0, Math.min(1, 1 - totalRemainingValue / totalScopeValue)) : 0
  const variations = scopes.filter((s) => s.isVariation)

  // Sum this month's claimed value: prefer thisMonthValue direct from sheet, else fall back to claimedPct * scopeValue
  let thisMonthClaimedValue = 0
  const scopeByName = new Map(scopes.map((s) => [s.scopeName, s]))
  for (const c of monthClaims) {
    if (c.thisMonthValue != null) {
      thisMonthClaimedValue += c.thisMonthValue
    } else if (c.claimedPct != null) {
      const sc = scopeByName.get(c.scopeName)
      if (sc?.scopeValue) thisMonthClaimedValue += c.claimedPct * sc.scopeValue
    }
  }

  return {
    projectNumber: p,
    totalScopeValue,
    totalRemainingValue,
    overallClaimedPct,
    variationsCount: variations.length,
    variationsValue: variations.reduce((s, v) => s + (v.scopeValue ?? 0), 0),
    thisMonthClaimedValue,
    thisMonthYearMonth: ym,
  }
}
