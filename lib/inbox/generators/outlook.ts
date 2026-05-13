/**
 * Inbox generator: Outlook emails needing a reply.
 *
 * Fetches emails Nathan has categorised "Needs Reply" in Outlook,
 * then cross-checks sent items to drop any that already have a reply
 * in the same conversation thread.
 *
 * Urgency: emails > 2 days old with no reply = "now", otherwise "today".
 */

import {
  getCategorisedMessages,
  getRepliedConversationIds,
  clearMessageCategory,
} from "@/lib/outlook/client"
import type { InboxItem } from "../types"

function ageInHours(receivedDateTime: string): number {
  return (Date.now() - new Date(receivedDateTime).getTime()) / 36e5
}

function formatAge(hours: number): string {
  if (hours < 24) return `${Math.round(hours)}h ago`
  return `${Math.round(hours / 24)}d ago`
}

export async function generateOutlookItems(): Promise<InboxItem[]> {
  if (!process.env.MS_TENANT_ID || !process.env.MS_CLIENT_ID || !process.env.MS_CLIENT_SECRET) {
    return []
  }

  const upn = process.env.OUTLOOK_USER_PRINCIPAL_NAME ?? "nathanh@dunsteel.com.au"

  let messages: Awaited<ReturnType<typeof getCategorisedMessages>>
  try {
    messages = await getCategorisedMessages({
      userPrincipalName: upn,
      limit: 30,
      categories: ["Needs Reply"],
    })
  } catch {
    return []
  }

  if (messages.length === 0) return []

  // Check sent items for replies since the oldest message
  const oldest = messages.reduce((min, m) =>
    m.receivedDateTime < min ? m.receivedDateTime : min,
    messages[0]!.receivedDateTime,
  )
  let repliedIds = new Set<string>()
  try {
    repliedIds = await getRepliedConversationIds(upn, oldest)
  } catch {
    // If sent-items check fails, surface all flagged emails rather than none
  }

  // Drop messages already replied to.
  const repliedMessages = messages.filter((m) => repliedIds.has(m.conversationId ?? ""))
  const unreplied = messages.filter((m) => !repliedIds.has(m.conversationId ?? ""))

  // Side-effect: clear the "Needs Reply" category from any message we
  // detected as already replied to. Best-effort - failures are logged in
  // the client and do not block the inbox.
  //
  // Fire-and-forget so the inbox doesn't wait on Graph PATCHes; the
  // categories will be cleared by the time the next inbox call hits.
  if (repliedMessages.length > 0) {
    void Promise.all(
      repliedMessages.map((m) =>
        clearMessageCategory(upn, m.id, m.categories, "Needs Reply"),
      ),
    )
  }

  return unreplied.map((m) => {
    const hours = ageInHours(m.receivedDateTime)
    const urgency: InboxItem["urgency"] = hours > 48 ? "now" : hours > 24 ? "today" : "this-week"
    return {
      id: `outlook:${m.id}`,
      source: "outlook" as const,
      urgency,
      title: m.subject || "(no subject)",
      context: `${m.from} · ${formatAge(hours)} · Needs Reply`,
      createdAt: m.receivedDateTime,
      actions: [
        { label: "Open in Outlook", href: m.webLink, variant: "primary" as const },
      ],
      raw: { messageId: m.id, from: m.from, categories: m.categories },
    }
  })
}
