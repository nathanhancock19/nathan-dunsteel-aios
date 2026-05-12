import Link from "next/link"

export const dynamic = "force-dynamic"

type Module = {
  name: string
  description: string
  url: string | undefined
}

function getModules(): Module[] {
  return [
    {
      name: "Day Docket App",
      description: "Subcontractor dockets, PM review, finance handover.",
      url: process.env.DAY_DOCKET_APP_URL,
    },
    {
      name: "SWMS form",
      description: "Tally form for site-specific SWMS submissions.",
      url: process.env.SWMS_TALLY_URL,
    },
    {
      name: "Site diary (Notion)",
      description: "Long-form site diary entries by project.",
      url: process.env.NOTION_SITE_DIARY_URL,
    },
    {
      name: "Project Forecast (Notion)",
      description: "Weekly-updated forecast of remaining project work.",
      url: process.env.NOTION_FORECAST_URL,
    },
  ]
}

export default function ModulesPage() {
  const modules = getModules()
  return (
    <section className="space-y-5">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight text-cream">Modules</h1>
        <p className="mt-1 text-sm text-muted">
          External tools that AIOS launches in a new tab.
        </p>
      </div>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {modules.map((m) => {
          const disabled = !m.url
          const Card = (
            <div
              className={`rounded-xl border p-4 transition ${
                disabled
                  ? "cursor-not-allowed border-rule bg-ink/20 opacity-50"
                  : "border-rule bg-ink/40 hover:border-border-strong hover:bg-ink/60"
              }`}
            >
              <div className="mb-1 flex items-center justify-between">
                <h2 className="font-semibold tracking-tight text-cream">{m.name}</h2>
                {disabled ? (
                  <span className="rounded-full border border-rule px-2 py-0.5 text-[10px] text-muted">
                    not set
                  </span>
                ) : (
                  <span className="text-[10px] text-muted">↗</span>
                )}
              </div>
              <p className="text-sm text-muted">{m.description}</p>
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
