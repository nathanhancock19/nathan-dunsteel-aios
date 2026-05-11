import { getCategorisedMessages, outlookConfigured } from "@/lib/outlook/client"
import { Card, EmptyState, ErrorState, ConfigState } from "./Card"

export async function OutlookCard() {
  if (!outlookConfigured()) {
    return (
      <Card title="Outlook flagged">
        <ConfigState envVar="MS_TENANT_ID + MS_CLIENT_ID + MS_CLIENT_SECRET" />
      </Card>
    )
  }
  try {
    const messages = await getCategorisedMessages({ limit: 5 })
    if (messages.length === 0) {
      return (
        <Card title="Outlook flagged" subtitle="Graph">
          <EmptyState>Inbox clear.</EmptyState>
        </Card>
      )
    }
    return (
      <Card title="Outlook flagged" subtitle={`${messages.length} pending`}>
        <ul className="space-y-2 text-sm">
          {messages.map((m) => (
            <li key={m.id}>
              <a
                href={m.webLink}
                target="_blank"
                rel="noreferrer"
                className="block rounded border border-rule/50 bg-ink/40 p-2 hover:border-signal"
              >
                <div className="flex items-center justify-between gap-2">
                  <span className="truncate text-cream">{m.subject || "(no subject)"}</span>
                  {m.categories.length > 0 ? (
                    <span className="text-[10px] uppercase tracking-wider text-signal">{m.categories[0]}</span>
                  ) : null}
                </div>
                <p className="mt-0.5 truncate text-xs text-muted">{m.from}</p>
              </a>
            </li>
          ))}
        </ul>
      </Card>
    )
  } catch (err) {
    return (
      <Card title="Outlook flagged">
        <ErrorState message={err instanceof Error ? err.message : String(err)} />
      </Card>
    )
  }
}
