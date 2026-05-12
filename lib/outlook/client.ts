/**
 * Microsoft Graph (Outlook) client - SCAFFOLD ONLY.
 *
 * Currently disabled: Microsoft tenant approval pending. Code path exists
 * so that the moment MS_TENANT_ID, MS_CLIENT_ID, MS_CLIENT_SECRET are set
 * and the tenant grants Mail.Read consent, the integration goes live.
 *
 * Auth flow (when enabled): client_credentials with scope
 * https://graph.microsoft.com/.default. Tokens cached for 50 minutes.
 *
 * For delegated user flow we'd need a different OAuth setup; not in scope.
 */

let cachedToken: { token: string; expiresAt: number } | null = null

export type OutlookCategorisedMessage = {
  id: string
  subject: string
  from: string
  receivedDateTime: string
  bodyPreview: string
  categories: string[]
  webLink: string
  isRead: boolean
  conversationId: string
}

const TARGET_CATEGORIES = ["Needs Reply", "To Be Discussed", "Urgent"] as const

function isConfigured(): boolean {
  return !!(process.env.MS_TENANT_ID && process.env.MS_CLIENT_ID && process.env.MS_CLIENT_SECRET)
}

export function outlookConfigured(): boolean {
  return isConfigured()
}

async function getToken(): Promise<string> {
  if (cachedToken && cachedToken.expiresAt > Date.now() + 30_000) return cachedToken.token
  if (!isConfigured()) throw new Error("Outlook not configured (MS_* env vars missing)")

  const tenantId = process.env.MS_TENANT_ID!
  const clientId = process.env.MS_CLIENT_ID!
  const clientSecret = process.env.MS_CLIENT_SECRET!

  const body = new URLSearchParams({
    grant_type: "client_credentials",
    client_id: clientId,
    client_secret: clientSecret,
    scope: "https://graph.microsoft.com/.default",
  })

  const res = await fetch(`https://login.microsoftonline.com/${tenantId}/oauth2/v2.0/token`, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body,
    cache: "no-store",
  })
  if (!res.ok) {
    throw new Error(`Outlook token HTTP ${res.status}: ${await res.text()}`)
  }
  const json = (await res.json()) as { access_token: string; expires_in: number }
  cachedToken = {
    token: json.access_token,
    expiresAt: Date.now() + Math.min(json.expires_in, 3000) * 1000,
  }
  return cachedToken.token
}

export async function getCategorisedMessages(opts?: {
  userPrincipalName?: string
  limit?: number
  categories?: string[]
}): Promise<OutlookCategorisedMessage[]> {
  if (!isConfigured()) return []
  const token = await getToken()
  const upn = opts?.userPrincipalName ?? process.env.OUTLOOK_USER_PRINCIPAL_NAME ?? "nathanh@dunsteel.com.au"
  const limit = opts?.limit ?? 25
  const categories = opts?.categories ?? TARGET_CATEGORIES

  // We can't filter by categories in $filter directly without complex constructs;
  // pull recent + filter client-side
  const url = new URL(`https://graph.microsoft.com/v1.0/users/${upn}/messages`)
  url.searchParams.set("$top", String(limit * 3))
  url.searchParams.set("$orderby", "receivedDateTime desc")
  url.searchParams.set("$select", "id,subject,from,receivedDateTime,bodyPreview,categories,webLink,isRead,conversationId")

  const res = await fetch(url.toString(), {
    headers: { Authorization: `Bearer ${token}` },
    cache: "no-store",
  })
  if (!res.ok) {
    throw new Error(`Graph mail HTTP ${res.status}: ${await res.text()}`)
  }
  const data = (await res.json()) as { value: Array<Record<string, unknown>> }
  const wanted = new Set(categories)
  return data.value
    .filter((m) => Array.isArray(m.categories) && (m.categories as string[]).some((c) => wanted.has(c)))
    .slice(0, limit)
    .map((m) => ({
      id: String(m.id),
      subject: String(m.subject ?? ""),
      from:
        typeof m.from === "object" && m.from !== null && "emailAddress" in (m.from as Record<string, unknown>)
          ? String(((m.from as Record<string, unknown>).emailAddress as Record<string, unknown>)?.name ?? "")
          : "",
      receivedDateTime: String(m.receivedDateTime ?? ""),
      bodyPreview: String(m.bodyPreview ?? ""),
      categories: (m.categories as string[]) ?? [],
      webLink: String(m.webLink ?? ""),
      isRead: Boolean(m.isRead ?? false),
      conversationId: String(m.conversationId ?? ""),
    }))
}

/**
 * For a list of messages, check which conversationIds have a sent reply.
 * Returns a Set of conversationIds that Nathan has already replied to.
 */
export async function getRepliedConversationIds(
  userPrincipalName: string,
  since: string,
): Promise<Set<string>> {
  const token = await getToken()
  const url = new URL(`https://graph.microsoft.com/v1.0/users/${userPrincipalName}/mailFolders/SentItems/messages`)
  url.searchParams.set("$top", "50")
  url.searchParams.set("$filter", `sentDateTime ge ${since}`)
  url.searchParams.set("$select", "conversationId,sentDateTime")
  const res = await fetch(url.toString(), {
    headers: { Authorization: `Bearer ${token}` },
    cache: "no-store",
  })
  if (!res.ok) return new Set()
  const data = (await res.json()) as { value: Array<{ conversationId: string }> }
  return new Set(data.value.map((m) => m.conversationId))
}

export async function pingOutlook(): Promise<{ ok: boolean; configured: boolean; error?: string }> {
  if (!isConfigured()) return { ok: false, configured: false }
  try {
    await getToken()
    return { ok: true, configured: true }
  } catch (err) {
    return { ok: false, configured: true, error: err instanceof Error ? err.message : String(err) }
  }
}
