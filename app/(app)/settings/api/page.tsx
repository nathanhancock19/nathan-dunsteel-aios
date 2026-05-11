import { Card } from "@/components/ui/Card"
import { KeyRound } from "lucide-react"

export const dynamic = "force-dynamic"

const EXPECTED_VARS = [
  { key: "ANTHROPIC_API_KEY", group: "AI" },
  { key: "AIOS_USER_USERNAME", group: "Auth" },
  { key: "AIOS_USER_PASSWORD_HASH", group: "Auth" },
  { key: "AUTH_SECRET", group: "Auth" },
  { key: "NEXTAUTH_SECRET", group: "Auth" },
  { key: "NEXTAUTH_URL", group: "Auth" },
  { key: "AIOS_PRIMARY_PROJECT_NUMBER", group: "Config" },
  { key: "AIOS_USER_MONDAY_ID", group: "Config" },
  { key: "POSTGRES_URL", group: "Database" },
  { key: "AIRTABLE_API_KEY", group: "Airtable" },
  { key: "AIRTABLE_BASE_ID", group: "Airtable" },
  { key: "NOTION_API_KEY", group: "Notion" },
  { key: "NOTION_PERFORMANCE_DIARY_DB", group: "Notion" },
  { key: "NOTION_SUBCON_DIARY_DB", group: "Notion" },
  { key: "NOTION_VOICE_MEMO_LOG_DB", group: "Notion" },
  { key: "NOTION_DEFECTS_411_DB", group: "Notion" },
  { key: "NOTION_GENERAL_NOTES_DB", group: "Notion" },
  { key: "NOTION_FORECAST_PAGE_ID", group: "Notion" },
  { key: "GOOGLE_SERVICE_ACCOUNT_KEY_B64", group: "Google" },
  { key: "GOOGLE_MER_SHEET_ID", group: "Google" },
  { key: "GOOGLE_NCR_FOLDER_ID", group: "Google" },
  { key: "MONDAY_API_KEY", group: "Monday" },
  { key: "MONDAY_PO_BOARD_ID", group: "Monday" },
  { key: "MONDAY_WORKSHOP_BOARD_ID", group: "Monday" },
  { key: "MS_TENANT_ID", group: "Microsoft" },
  { key: "MS_CLIENT_ID", group: "Microsoft" },
  { key: "MS_CLIENT_SECRET", group: "Microsoft" },
  { key: "OUTLOOK_USER_PRINCIPAL_NAME", group: "Microsoft" },
  { key: "N8N_API_KEY_DUNSTEEL", group: "n8n" },
  { key: "N8N_BASE_URL", group: "n8n" },
  { key: "DUNSTEEL_BOT_TOKEN", group: "Telegram" },
  { key: "DUNSTEEL_CHAT_ID", group: "Telegram" },
] as const

export default function ApiPage() {
  const groups: Record<string, Array<{ key: string; set: boolean }>> = {}
  for (const v of EXPECTED_VARS) {
    if (!groups[v.group]) groups[v.group] = []
    groups[v.group]!.push({ key: v.key, set: !!process.env[v.key] })
  }
  const totalSet = EXPECTED_VARS.filter((v) => !!process.env[v.key]).length

  return (
    <div className="space-y-4">
      <Card title="Environment variables" icon={KeyRound}>
        <p className="text-sm text-fg-muted">
          {totalSet} of {EXPECTED_VARS.length} expected env vars are set on this deployment. Values are masked.
        </p>
      </Card>

      {Object.entries(groups).map(([group, vars]) => (
        <Card key={group} title={group}>
          <ul className="space-y-1 text-xs">
            {vars.map((v) => (
              <li key={v.key} className="flex items-center justify-between gap-3 rounded px-2 py-1 hover:bg-surface-2">
                <code className="font-mono text-[11px] text-fg-muted">{v.key}</code>
                <span className={v.set ? "text-success" : "text-fg-subtle"}>{v.set ? "set" : "missing"}</span>
              </li>
            ))}
          </ul>
        </Card>
      ))}
    </div>
  )
}
