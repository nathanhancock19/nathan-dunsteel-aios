import { listRecords, TABLES } from "@/lib/airtable"
import { Card } from "@/components/ui/Card"
import { EmptyState } from "@/components/ui/EmptyState"
import { Stat } from "@/components/ui/Stat"
import { HardHat, ClipboardList } from "lucide-react"

/**
 * "This week on site" - subs may not fill the docket app every day, so we
 * widen the window to show meaningful activity rather than today-only.
 */
export async function SiteActivityCard() {
  const projectFilter = process.env.AIOS_PRIMARY_PROJECT_NUMBER
  const today = new Date()
  const since = new Date(today)
  since.setDate(since.getDate() - 7)
  const sinceIso = since.toISOString().slice(0, 10)

  let docketCount = 0
  const companies = new Set<string>()
  const projects = new Set<string>()
  let workerEntries = 0
  let errored: string | null = null

  try {
    const clauses: string[] = [`IS_AFTER({Date}, "${sinceIso}")`]
    if (projectFilter) clauses.push(`FIND("${projectFilter}", ARRAYJOIN({Project}, ","))`)
    const formula = clauses.length === 1 ? clauses[0]! : `AND(${clauses.join(", ")})`
    const records = await listRecords(TABLES.DAY_DOCKETS, {
      filterByFormula: formula,
      maxRecords: 200,
      fields: ["Date", "Project", "Company", "Worker Entries"],
    })
    docketCount = records.length
    for (const r of records) {
      const proj = r.fields["Project"]
      const co = r.fields["Company"]
      const w = r.fields["Worker Entries"]
      if (Array.isArray(proj)) for (const p of proj) projects.add(String(p))
      if (Array.isArray(co)) for (const c of co) companies.add(String(c))
      if (Array.isArray(w)) workerEntries += w.length
    }
  } catch (err) {
    errored = err instanceof Error ? err.message : String(err)
  }

  if (errored) {
    return (
      <Card title="On site this week" icon={HardHat}>
        <p className="text-xs text-danger">{errored}</p>
      </Card>
    )
  }

  if (docketCount === 0) {
    return (
      <Card title="On site this week" subtitle={`Since ${sinceIso}`} icon={HardHat}>
        <EmptyState
          icon={ClipboardList}
          title="No dockets this week"
          description="Subs may not have filed via the docket app yet."
        />
      </Card>
    )
  }

  return (
    <Card title="On site this week" subtitle={`Since ${sinceIso}`} icon={HardHat}>
      <div className="grid grid-cols-3 gap-3">
        <Stat label="Dockets" value={docketCount} />
        <Stat label="Subs" value={companies.size} />
        <Stat label="Workers" value={workerEntries} />
      </div>
    </Card>
  )
}
