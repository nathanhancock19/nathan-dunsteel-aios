import Link from "next/link"
import { listRecords, TABLES } from "@/lib/airtable"

export const dynamic = "force-dynamic"

export default async function ProjectsPage() {
  let records:
    | Awaited<ReturnType<typeof listRecords<typeof TABLES.PROJECTS>>>
    | null = null
  let error: string | null = null

  const primaryProject = process.env.AIOS_PRIMARY_PROJECT_NUMBER
  try {
    records = await listRecords(TABLES.PROJECTS, {
      maxRecords: 50,
      filterByFormula: primaryProject
        ? `FIND("${primaryProject}", {Project Number})`
        : "",
      fields: [
        "Project Number",
        "Strumus Name",
        "PM Assigned",
        "Status",
        "Assigned Companies",
      ],
    })
  } catch (err) {
    error = err instanceof Error ? err.message : String(err)
  }

  return (
    <section>
      <h1 className="mb-1 text-2xl font-semibold tracking-tight">
        {primaryProject ? `Project ${primaryProject}` : "Projects"}
      </h1>
      <p className="mb-6 text-sm text-muted">
        {primaryProject
          ? `Filtered to your primary project. Unset AIOS_PRIMARY_PROJECT_NUMBER in .env.local to see all.`
          : "Live read from the shared Airtable base."}
      </p>

      {error ? (
        <div className="rounded-md border border-red-900 bg-red-950/40 p-4 text-sm text-red-200">
          <strong>Airtable error:</strong> {error}
        </div>
      ) : null}

      {records && records.length === 0 ? (
        <p className="text-sm text-muted">No projects found.</p>
      ) : null}

      {records && records.length > 0 ? (
        <div className="overflow-x-auto rounded-lg border border-rule">
          <table className="w-full text-sm">
            <thead className="bg-surface-2 text-left text-xs uppercase tracking-wider text-muted">
              <tr>
                <th className="px-4 py-2 font-semibold">Project #</th>
                <th className="px-4 py-2 font-semibold">Strumis name</th>
                <th className="px-4 py-2 font-semibold">PM</th>
                <th className="px-4 py-2 font-semibold">Status</th>
                <th className="px-4 py-2 font-semibold">Subs</th>
                <th className="px-4 py-2" />
              </tr>
            </thead>
            <tbody className="divide-y divide-rule">
              {records.map((r) => {
                const pm = r.fields["PM Assigned"]
                const subs = r.fields["Assigned Companies"]
                const number = String(r.fields["Project Number"] ?? "")
                return (
                  <tr key={r.id} className="bg-ink hover:bg-surface-2">
                    <td className="px-4 py-2 font-mono text-cream">{number}</td>
                    <td className="px-4 py-2 text-cream">
                      {String(r.fields["Strumus Name"] ?? "")}
                    </td>
                    <td className="px-4 py-2 text-fg-muted">
                      {Array.isArray(pm) ? pm.join(", ") : String(pm ?? "")}
                    </td>
                    <td className="px-4 py-2 text-fg-muted">
                      {String(r.fields.Status ?? "")}
                    </td>
                    <td className="px-4 py-2 text-muted">
                      {Array.isArray(subs) ? subs.length : 0}
                    </td>
                    <td className="px-4 py-2 text-right">
                      {number && (
                        <Link
                          href={`/projects/${number}`}
                          className="text-xs text-muted hover:text-cream"
                        >
                          Open →
                        </Link>
                      )}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      ) : null}
    </section>
  )
}
