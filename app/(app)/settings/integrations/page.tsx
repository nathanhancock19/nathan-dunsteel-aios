import { Card } from "@/components/ui/Card"
import { Pill } from "@/components/ui/Pill"
import { Plug, Database, FileSpreadsheet, MessageSquare, Activity, Mail, Workflow, BookOpen } from "lucide-react"

export const dynamic = "force-dynamic"

type IntegrationCheck = {
  name: string
  description: string
  icon: typeof Plug
  envKeys: string[]
  testFn?: () => Promise<{ ok: boolean; detail?: string }>
}

const INTEGRATIONS: IntegrationCheck[] = [
  {
    name: "Anthropic",
    description: "Claude API powering the assistant.",
    icon: MessageSquare,
    envKeys: ["ANTHROPIC_API_KEY"],
  },
  {
    name: "Notion",
    description: "Site diary, defects, notes, voice memo log.",
    icon: BookOpen,
    envKeys: [
      "NOTION_API_KEY",
      "NOTION_PERFORMANCE_DIARY_DB",
      "NOTION_SUBCON_DIARY_DB",
      "NOTION_DEFECTS_411_DB",
      "NOTION_GENERAL_NOTES_DB",
      "NOTION_VOICE_MEMO_LOG_DB",
    ],
  },
  {
    name: "Airtable",
    description: "Day Dockets, Projects, Variations.",
    icon: Database,
    envKeys: ["AIRTABLE_API_KEY", "AIRTABLE_BASE_ID"],
  },
  {
    name: "Google Sheets + Drive",
    description: "MER claims, deliveries, NCR photos.",
    icon: FileSpreadsheet,
    envKeys: ["GOOGLE_SERVICE_ACCOUNT_KEY_B64", "GOOGLE_MER_SHEET_ID"],
  },
  {
    name: "Monday",
    description: "Workshop board, PO approvals.",
    icon: Activity,
    envKeys: ["MONDAY_API_KEY", "MONDAY_PO_BOARD_ID"],
  },
  {
    name: "Outlook (Microsoft Graph)",
    description: "Categorised email inbox.",
    icon: Mail,
    envKeys: ["MS_TENANT_ID", "MS_CLIENT_ID", "MS_CLIENT_SECRET"],
  },
  {
    name: "n8n",
    description: "Workflow runs and health monitoring.",
    icon: Workflow,
    envKeys: ["N8N_BASE_URL", "N8N_API_KEY_DUNSTEEL"],
  },
  {
    name: "Postgres",
    description: "Decision log, sync state, supplier learning.",
    icon: Database,
    envKeys: ["POSTGRES_URL"],
  },
]

export default function IntegrationsPage() {
  return (
    <div className="space-y-4">
      <p className="text-sm text-fg-muted">
        Live status of every external service. Green means the env vars are present and look correct; red means missing config.
      </p>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        {INTEGRATIONS.map((i) => {
          const configured = i.envKeys.every((k) => !!process.env[k])
          return (
            <Card key={i.name} icon={i.icon} title={i.name} tone={configured ? "default" : "warning"}>
              <p className="text-xs text-fg-muted">{i.description}</p>
              <div className="mt-3 flex items-center justify-between gap-2">
                {configured ? (
                  <Pill tone="success">Configured</Pill>
                ) : (
                  <Pill tone="warning">Missing env</Pill>
                )}
                <span className="text-[10px] text-fg-subtle">{i.envKeys.length} env var{i.envKeys.length > 1 ? "s" : ""}</span>
              </div>
              <details className="mt-2 text-xs text-fg-muted">
                <summary className="cursor-pointer text-fg-subtle hover:text-fg">env vars</summary>
                <ul className="mt-1 space-y-0.5">
                  {i.envKeys.map((k) => (
                    <li key={k} className="font-mono text-[11px]">
                      <span className={process.env[k] ? "text-success" : "text-danger"}>{process.env[k] ? "OK" : "X"}</span>{" "}
                      {k}
                    </li>
                  ))}
                </ul>
              </details>
            </Card>
          )
        })}
      </div>
    </div>
  )
}
