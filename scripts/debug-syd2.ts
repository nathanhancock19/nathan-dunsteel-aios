import { google } from "googleapis"
import { GoogleAuth } from "google-auth-library"

async function main() {
  const credentials = JSON.parse(Buffer.from(process.env.GOOGLE_SERVICE_ACCOUNT_KEY_B64!, "base64").toString("utf-8"))
  const auth = new GoogleAuth({ credentials, scopes: ["https://www.googleapis.com/auth/spreadsheets.readonly"] })
  const sheets = google.sheets({ version: "v4", auth })
  const res = await sheets.spreadsheets.values.get({
    spreadsheetId: process.env.GOOGLE_MER_SHEET_ID,
    range: "Sheet1!A105:I130",
    valueRenderOption: "FORMATTED_VALUE",
  })
  const rows = res.data.values ?? []
  for (let i = 0; i < rows.length; i++) {
    const r = rows[i] ?? []
    const cells = r.slice(0, 9).map((c) => `"${String(c).slice(0, 18)}"`).join(" | ")
    console.log(`row ${(105 + i).toString().padStart(3)}: ${cells}`)
  }
}

main().catch((e) => { console.error(e); process.exit(1) })
