/**
 * Categorise NCR photos by parsing the filename and description.
 *
 * Each photo is uploaded to Drive with a filename like
 *   "5EB180 Cleat not welded on beam for column.jpg"
 *
 * From the filename we extract: assembly tag (leading token), level (first
 * digit of assembly), description (remainder), category (keyword match).
 */
import { listNcrPhotos, type NcrPhoto } from "./ncr"

export type NcrCategory =
  | "Cleat on Wrong Side"
  | "Cleat in Wrong Location"
  | "Cleat Upside Down / 180°"
  | "Cleat Missing / Not Welded"
  | "Holes Not Drilled / Incorrect"
  | "Drawing / Design Error"
  | "Other / Unknown"

export const CATEGORY_COLORS: Record<NcrCategory, string> = {
  "Cleat on Wrong Side": "#4A6F8F",
  "Cleat in Wrong Location": "#8B9CAB",
  "Cleat Upside Down / 180°": "#1B3A52",
  "Cleat Missing / Not Welded": "#294E6D",
  "Holes Not Drilled / Incorrect": "#647A8E",
  "Drawing / Design Error": "#15293D",
  "Other / Unknown": "#B6C3CE",
}

export const CATEGORY_ORDER: NcrCategory[] = [
  "Cleat on Wrong Side",
  "Cleat in Wrong Location",
  "Cleat Upside Down / 180°",
  "Cleat Missing / Not Welded",
  "Holes Not Drilled / Incorrect",
  "Drawing / Design Error",
  "Other / Unknown",
]

export type NcrRecord = {
  id: string
  date: string
  level: string
  assembly: string
  description: string
  category: NcrCategory
  thumbnailLink?: string
  webViewLink?: string
}

function categoriseDescription(desc: string): NcrCategory {
  const d = desc.toLowerCase()
  if (/upside\s*down|180/.test(d)) return "Cleat Upside Down / 180°"
  if (/missing|not\s*welded|missed/.test(d)) return "Cleat Missing / Not Welded"
  if (/wrong\s*side|underside|bottom\s+of\s+beam|wrong\s+side\s+of/.test(d)) return "Cleat on Wrong Side"
  if (/wrong\s*location|incorrect\s+location|100mm|wrong\s+location|recurring/.test(d)) return "Cleat in Wrong Location"
  if (/hole|drilled/.test(d)) return "Holes Not Drilled / Incorrect"
  if (/drawing|detailing\s*error|design\s*error/.test(d)) return "Drawing / Design Error"
  if (/cleat/.test(d) && /incorrect|wrong/.test(d)) return "Cleat in Wrong Location"
  return "Other / Unknown"
}

function levelFromAssembly(assembly: string | null | undefined): string {
  if (!assembly) return "Unknown"
  const a = assembly.toUpperCase()
  // Standard pattern: leading digit = level (e.g. 5EB180 -> L5, 2EC34 -> L2)
  const m = a.match(/^(\d)/)
  if (m && Number(m[1]) >= 1 && Number(m[1]) <= 9) return `L${m[1]}`
  // Stair pattern
  if (/STAIR/i.test(a)) return "Stair"
  if (/^20/i.test(a) || /^19/i.test(a)) return "Other"
  return "Other"
}

function toRecord(p: NcrPhoto): NcrRecord {
  const assembly = p.parsedAssembly ?? "Unknown"
  const description = p.parsedDefectType ?? p.name
  return {
    id: p.id,
    date: p.createdTime.slice(0, 10),
    level: levelFromAssembly(assembly),
    assembly,
    description,
    category: categoriseDescription(description),
    thumbnailLink: p.thumbnailLink,
    webViewLink: p.webViewLink,
  }
}

export async function getNcrAnalytics(): Promise<{
  records: NcrRecord[]
  total: number
  byCategory: Array<{ name: NcrCategory; count: number; color: string }>
  byLevel: Array<{ name: string; count: number }>
  byDay: Array<{ date: string; count: number }>
  topCategory: { name: NcrCategory; count: number } | null
  topLevel: { name: string; count: number } | null
}> {
  const { photos } = await listNcrPhotos({ limit: 500 })
  const records = photos.map(toRecord)

  const catCounts: Partial<Record<NcrCategory, number>> = {}
  const levelCounts: Record<string, number> = {}
  const dayCounts: Record<string, number> = {}
  for (const r of records) {
    catCounts[r.category] = (catCounts[r.category] ?? 0) + 1
    levelCounts[r.level] = (levelCounts[r.level] ?? 0) + 1
    dayCounts[r.date] = (dayCounts[r.date] ?? 0) + 1
  }

  const byCategory = CATEGORY_ORDER
    .map((name) => ({ name, count: catCounts[name] ?? 0, color: CATEGORY_COLORS[name] }))
    .filter((b) => b.count > 0)

  const levelOrder = ["L1", "L2", "L3", "L4", "L5", "L6", "L7", "Stair", "Other", "Unknown"]
  const byLevel = levelOrder
    .filter((l) => levelCounts[l])
    .map((l) => ({ name: l, count: levelCounts[l]! }))

  const byDay = Object.entries(dayCounts)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([date, count]) => ({ date, count }))

  const topCategory = byCategory[0] ? { name: byCategory[0].name, count: byCategory[0].count } : null
  const topLevel = byLevel.length > 0 ? [...byLevel].sort((a, b) => b.count - a.count)[0]! : null

  return { records, total: records.length, byCategory, byLevel, byDay, topCategory, topLevel }
}
