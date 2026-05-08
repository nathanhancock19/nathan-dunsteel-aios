/**
 * Telegram notification helpers for AIOS.
 *
 * Uses DUNSTEEL_BOT_TOKEN. Chat ID recipients are configured per call so
 * callers can target Nathan (DUNSTEEL_CHAT_ID) or Harry (HARRY_CHAT_ID).
 * Failed sends are caught and logged but never block the underlying action.
 */

const TELEGRAM_API = "https://api.telegram.org"

function botToken(): string {
  const token = process.env.DUNSTEEL_BOT_TOKEN
  if (!token) throw new Error("DUNSTEEL_BOT_TOKEN not set")
  return token
}

export async function sendMessage(chatId: string, text: string): Promise<void> {
  const res = await fetch(`${TELEGRAM_API}/bot${botToken()}/sendMessage`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ chat_id: chatId, text, parse_mode: "HTML" }),
  })
  if (!res.ok) {
    throw new Error(`Telegram ${res.status}: ${await res.text()}`)
  }
}

/**
 * Fire-and-forget version. Logs on failure, never throws.
 */
export async function notifyNathan(text: string): Promise<void> {
  const chatId = process.env.DUNSTEEL_CHAT_ID
  if (!chatId || !process.env.DUNSTEEL_BOT_TOKEN) return
  try {
    await sendMessage(chatId, text)
  } catch (err) {
    console.error("[telegram] notifyNathan failed:", err)
  }
}
