/**
 * Project drill-down page.
 *
 * Composes a per-project snapshot from the data sources AIOS already has:
 *   - Airtable Projects (basic info)
 *   - Notion project forecast (programme position)
 *   - Airtable variations (open list)
 *   - Notion general notes (high-priority list)
 *   - Drive NCR analytics (defect count)
 *   - Notion site diary (today's entry)
 *   - Google Sheets delivery schedule (last/next delivery)
 *
 * Falls back gracefully if any source errors — each panel renders its own
 * error state so a Notion outage doesn't blank the whole page.
 */

import Link from "next/link"
import { listRecords, TABLES } from "@/lib/airtable"
import { getProjectForecast } from "@/lib/notion/forecast"
import { listVariations } from "@/lib/airtable/variations"
import { getHighPriorityNotes } from "@/lib/notion"
import { getNcrAnalytics } from "@/lib/drive/ncr-analytics"
import { getDiaryEntriesForDate } from "@/lib/notion/diary"
import { getDeliveriesForWeek } from "@/lib/sheets/deliveries"
import { sydneyTodayIso } from "@/lib/utils/today"

export const dynamic = "force-dynamic"

type Props = { params: { projectNumber: string } }

export default async function ProjectDetailPage({ params }: Props) {
  const number = params.projectNumber
  const today = sydneyTodayIso()

  // Run all panels in parallel — each is independently fault-tolerant.
  const [
    project,
    forecast,
    variations,
    notes,
    defects,
    diary,
    deliveries,
  ] = await Promise.allSettled([
    fetchProject(number),
    getProjectForecast(),
    listVariations({ status: "Open", limit: 10 }),
    getHighPriorityNotes(number),
    getNcrAnalytics(),
    getDiaryEntriesForDate({ date: today }),
    getDeliveriesForWeek({ projectFilter: number }),
  ])

  const projectInfo = project.status === "fulfilled" ? project.value : null
  const projectName = projectInfo?.name ?? `Project ${number}`
  const projectStatus = projectInfo?.status ?? "(no status)"

  return (
    <section className="space-y-6">
      <header className="border-b border-rule pb-4">
        <Link href="/projects" className="text-xs text-muted hover:text-cream">
          ← Projects
        </Link>
        <h1 className="mt-1 text-2xl font-semibold tracking-tight text-cream">
          {projectName}
        </h1>
        <p className="mt-1 text-sm text-muted">
          Project {number} · {projectStatus}
        </p>
      </header>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <Panel title="Programme">
          {forecast.status === "fulfilled" && forecast.value ? (
            <ForecastSnapshot forecast={forecast.value} projectNumber={number} />
          ) : (
            <Empty>
              {forecast.status === "rejected"
                ? forecast.reason instanceof Error
                  ? forecast.reason.message
                  : "Could not load forecast"
                : "NOTION_FORECAST_PAGE_ID not set"}
            </Empty>
          )}
        </Panel>

        <Panel title="Today's diary" subtitle={today}>
          {diary.status === "fulfilled" && diary.value.length > 0 ? (
            <ul className="space-y-2 text-sm">
              {diary.value.slice(0, 3).map((e) => (
                <li key={e.id}>
                  <p className="font-medium text-cream">{e.title}</p>
                  {e.workCompleted ? (
                    <p className="mt-0.5 text-xs text-muted">
                      {e.workCompleted.slice(0, 160)}
                      {e.workCompleted.length > 160 ? "…" : ""}
                    </p>
                  ) : null}
                </li>
              ))}
            </ul>
          ) : (
            <Empty>
              {diary.status === "rejected" ? "Diary unavailable" : "No diary entry today"}
            </Empty>
          )}
        </Panel>

        <Panel
          title="Open variations"
          subtitle={
            variations.status === "fulfilled" ? `${variations.value.length} open` : ""
          }
          link={{ href: "/variations", label: "Open all" }}
        >
          {variations.status === "fulfilled" && variations.value.length > 0 ? (
            <ul className="space-y-1 text-sm">
              {variations.value.slice(0, 5).map((v) => (
                <li key={v.id} className="flex justify-between gap-2">
                  <span className="text-cream">
                    {v.variationNumber || "(no #)"} {v.title}
                  </span>
                  {v.total != null && (
                    <span className="shrink-0 mono-nums text-xs text-muted">
                      $
                      {v.total.toLocaleString("en-AU", {
                        maximumFractionDigits: 0,
                      })}
                    </span>
                  )}
                </li>
              ))}
            </ul>
          ) : (
            <Empty>
              {variations.status === "rejected" ? "Variations unavailable" : "No open variations"}
            </Empty>
          )}
        </Panel>

        <Panel
          title="High-priority notes"
          subtitle={
            notes.status === "fulfilled" ? `${notes.value.length} open` : ""
          }
        >
          {notes.status === "fulfilled" && notes.value.length > 0 ? (
            <ul className="space-y-1 text-sm">
              {notes.value.slice(0, 5).map((n) => (
                <li key={n.id} className="text-cream">
                  <span className="mr-2 text-xs uppercase tracking-wider text-muted">
                    {n.category ?? "general"}
                  </span>
                  {n.title}
                </li>
              ))}
            </ul>
          ) : (
            <Empty>
              {notes.status === "rejected" ? "Notes unavailable" : "No open high-priority notes"}
            </Empty>
          )}
        </Panel>

        <Panel title="NCR / defects">
          {defects.status === "fulfilled" ? (
            <DefectsSummary
              total={defects.value.total}
              topCategory={defects.value.topCategory}
              topLevel={defects.value.topLevel}
            />
          ) : (
            <Empty>NCR analytics unavailable</Empty>
          )}
        </Panel>

        <Panel title="Deliveries this week">
          {deliveries.status === "fulfilled" ? (
            <DeliveriesSummary days={deliveries.value} today={today} />
          ) : (
            <Empty>Deliveries unavailable</Empty>
          )}
        </Panel>
      </div>
    </section>
  )
}

async function fetchProject(
  number: string,
): Promise<{ name: string; status: string } | null> {
  try {
    const records = await listRecords(TABLES.PROJECTS, {
      maxRecords: 1,
      filterByFormula: `FIND("${number}", {Project Number})`,
      fields: ["Project Number", "Strumus Name", "Status"],
    })
    if (records.length === 0) return null
    return {
      name: String(records[0].fields["Strumus Name"] ?? `Project ${number}`),
      status: String(records[0].fields.Status ?? "(no status)"),
    }
  } catch {
    return null
  }
}

function Panel({
  title,
  subtitle,
  link,
  children,
}: {
  title: string
  subtitle?: string
  link?: { href: string; label: string }
  children: React.ReactNode
}) {
  return (
    <div className="rounded-lg border border-rule bg-ink/60 p-4">
      <div className="mb-3 flex items-baseline justify-between gap-2">
        <h2 className="text-sm font-semibold text-cream">{title}</h2>
        {subtitle ? <span className="text-xs text-muted">{subtitle}</span> : null}
        {link ? (
          <Link href={link.href} className="ml-auto text-xs text-muted hover:text-cream">
            {link.label} →
          </Link>
        ) : null}
      </div>
      {children}
    </div>
  )
}

function Empty({ children }: { children: React.ReactNode }) {
  return <p className="text-xs italic text-muted">{children}</p>
}

function ForecastSnapshot({
  forecast,
  projectNumber,
}: {
  forecast: Awaited<ReturnType<typeof getProjectForecast>>
  projectNumber: string
}) {
  if (!forecast) return <Empty>Forecast not configured</Empty>
  // Try to find the row(s) for this project number.
  const matchIdx = forecast.headers.findIndex((h) => /project/i.test(h) || /number/i.test(h))
  const projectRow = matchIdx >= 0
    ? forecast.rows.find((row) => row[matchIdx]?.includes(projectNumber))
    : null
  if (!projectRow) {
    return (
      <div className="space-y-1 text-xs text-muted">
        <p>Forecast loaded ({forecast.rows.length} rows). No row matched this project number.</p>
        {forecast.lastEdited ? (
          <p>Last edited {new Date(forecast.lastEdited).toLocaleDateString("en-AU", { timeZone: "Australia/Sydney" })}</p>
        ) : null}
      </div>
    )
  }
  return (
    <dl className="grid grid-cols-2 gap-x-3 gap-y-1 text-xs">
      {forecast.headers.map((h, i) => {
        const v = projectRow[i] ?? ""
        if (!v) return null
        return (
          <div key={`${h}-${i}`} className="contents">
            <dt className="truncate uppercase tracking-wider text-muted">{h}</dt>
            <dd className="truncate text-cream">{v}</dd>
          </div>
        )
      })}
    </dl>
  )
}

function DefectsSummary({
  total,
  topCategory,
  topLevel,
}: {
  total: number
  topCategory: { name: string; count: number } | null
  topLevel: { name: string; count: number } | null
}) {
  if (total === 0) return <Empty>No NCR photos captured</Empty>
  return (
    <div className="space-y-1 text-sm">
      <p className="text-cream">
        <span className="mono-nums text-lg font-semibold">{total}</span>{" "}
        <span className="text-muted">total NCR photos</span>
      </p>
      {topCategory ? (
        <p className="text-xs text-muted">
          Top type: <span className="text-cream">{topCategory.name}</span> ({topCategory.count})
        </p>
      ) : null}
      {topLevel ? (
        <p className="text-xs text-muted">
          Top level: <span className="text-cream">{topLevel.name}</span> ({topLevel.count})
        </p>
      ) : null}
    </div>
  )
}

function DeliveriesSummary({
  days,
  today,
}: {
  days: Array<{ date: string; jobs: Array<{ project: string }> }>
  today: string
}) {
  const todayJobs = days.find((d) => d.date === today)?.jobs.length ?? 0
  const upcomingDay = days.find((d) => d.date > today && d.jobs.length > 0)
  const weekTotal = days.reduce((n, d) => n + d.jobs.length, 0)
  if (weekTotal === 0) return <Empty>No deliveries this week</Empty>
  return (
    <div className="space-y-1 text-sm">
      <p className="text-cream">
        <span className="mono-nums text-lg font-semibold">{weekTotal}</span>{" "}
        <span className="text-muted">delivery{weekTotal === 1 ? "" : "ies"} this week</span>
      </p>
      <p className="text-xs text-muted">
        Today: <span className="text-cream">{todayJobs}</span>
      </p>
      {upcomingDay ? (
        <p className="text-xs text-muted">
          Next:{" "}
          <span className="text-cream">
            {upcomingDay.date} ({upcomingDay.jobs.length})
          </span>
        </p>
      ) : null}
    </div>
  )
}
