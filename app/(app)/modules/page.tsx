import Link from "next/link"

export const dynamic = "force-dynamic"

type Module = {
  name: string
  description: string
  url: string | undefined
  status: "live" | "todo"
}

function getModules(): Module[] {
  return [
    {
      name: "Day Docket App",
      description: "Subcontractor dockets, PM review, finance handover.",
      url: process.env.DAY_DOCKET_APP_URL,
      status: "live",
    },
    {
      name: "SWMS form",
      description: "Tally form for site-specific SWMS submissions.",
      url: process.env.SWMS_TALLY_URL,
      status: "live",
    },
    {
      name: "Site diary (Notion)",
      description: "Long-form site diary entries by project.",
      url: process.env.NOTION_SITE_DIARY_URL,
      status: "live",
    },
    {
      name: "Power BI",
      description: "Project budget and cost reports until Budget Tracker module ships.",
      url: process.env.POWER_BI_URL,
      status: "live",
    },
    {
      name: "Project Forecast (Notion)",
      description: "Weekly-updated forecast of remaining project work.",
      url: process.env.NOTION_FORECAST_URL,
      status: "live",
    },
  ]
}

export default function ModulesPage() {
  const modules = getModules()
  return (
    <section>
      <h1 className="mb-1 text-2xl font-semibold tracking-tight">Modules</h1>
      <p className="mb-6 text-sm text-neutral-400">
        External tools that AIOS launches in a new tab. Deeper integration arrives in v2.
      </p>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {modules.map((m) => {
          const disabled = !m.url
          const Card = (
            <div
              className={`rounded-lg border p-4 transition ${
                disabled
                  ? "cursor-not-allowed border-neutral-800 bg-neutral-900 opacity-60"
                  : "border-neutral-800 bg-neutral-900 hover:border-orange-500"
              }`}
            >
              <div className="mb-1 flex items-center justify-between">
                <h2 className="font-semibold tracking-tight">{m.name}</h2>
                {disabled ? (
                  <span className="rounded-full border border-neutral-700 px-2 py-0.5 text-xs text-neutral-400">
                    URL not set
                  </span>
                ) : null}
              </div>
              <p className="text-sm text-neutral-400">{m.description}</p>
            </div>
          )
          return disabled ? (
            <div key={m.name}>{Card}</div>
          ) : (
            <Link key={m.name} href={m.url!} target="_blank" rel="noreferrer">
              {Card}
            </Link>
          )
        })}
      </div>
    </section>
  )
}
