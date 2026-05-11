/**
 * Google service account authentication for AIOS.
 *
 * Reads `GOOGLE_SERVICE_ACCOUNT_KEY` from env. The value is the full JSON
 * service account key as a single-line string. Vercel handles the line
 * preservation; for local dev paste the JSON verbatim with newlines escaped
 * as \n inside the private_key field (or set GOOGLE_SERVICE_ACCOUNT_KEY_B64
 * to a base64-encoded version of the JSON).
 *
 * Returned `GoogleAuth` instance is cached per-process; reuse across calls.
 */
import { GoogleAuth } from "google-auth-library"

let cached: GoogleAuth | null = null

const SCOPES = [
  "https://www.googleapis.com/auth/spreadsheets.readonly",
  "https://www.googleapis.com/auth/drive.readonly",
]

function loadKeyJson(): Record<string, unknown> {
  const raw = process.env.GOOGLE_SERVICE_ACCOUNT_KEY ?? process.env.GOOGLE_SERVICE_ACCOUNT_KEY_B64
  if (!raw) {
    throw new Error(
      "GOOGLE_SERVICE_ACCOUNT_KEY (or _B64) not set. " +
        "Set it to the service account JSON in Vercel env vars."
    )
  }
  let json: string
  if (process.env.GOOGLE_SERVICE_ACCOUNT_KEY_B64) {
    json = Buffer.from(raw, "base64").toString("utf-8")
  } else {
    json = raw
  }
  try {
    return JSON.parse(json)
  } catch (err) {
    throw new Error(`GOOGLE_SERVICE_ACCOUNT_KEY is not valid JSON: ${err instanceof Error ? err.message : String(err)}`)
  }
}

export function getGoogleAuth(): GoogleAuth {
  if (cached) return cached
  const credentials = loadKeyJson()
  cached = new GoogleAuth({ credentials, scopes: SCOPES })
  return cached
}

export async function pingGoogle(): Promise<{ ok: boolean; email?: string; error?: string }> {
  try {
    const auth = getGoogleAuth()
    await auth.getClient()
    const projectId = await auth.getProjectId().catch(() => undefined)
    const credentials = loadKeyJson()
    return {
      ok: true,
      email: typeof credentials.client_email === "string" ? credentials.client_email : projectId,
    }
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : String(err) }
  }
}
