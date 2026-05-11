import { google } from "googleapis"
import { GoogleAuth } from "google-auth-library"

async function main() {
  const credentials = JSON.parse(Buffer.from(process.env.GOOGLE_SERVICE_ACCOUNT_KEY_B64!, "base64").toString("utf-8"))
  const auth = new GoogleAuth({ credentials, scopes: ["https://www.googleapis.com/auth/spreadsheets.readonly"] })
  const sheets = google.sheets({ version: "v4", auth })
  // Row 1 (month labels) wide
  const labels = await sheets.spreadsheets.values.get({
    spreadsheetId: process.env.GOOGLE_MER_SHEET_ID,
    range: "Sheet1!A2:CN3",
    valueRenderOption: "FORMATTED_VALUE",
  })
  const monthRow = (labels.data.values?.[0]) ?? []
  console.log("Month labels (non-empty):")
  for (let i = 0; i < monthRow.length; i++) {
    if (monthRow[i]) console.log(`  col ${i}: "${monthRow[i]}"`)
  }

  // Row 107 (SYD2 Scope 1 = Level 2) wide
  const rowRes = await sheets.spreadsheets.values.get({
    spreadsheetId: process.env.GOOGLE_MER_SHEET_ID,
    range: "Sheet1!108:108",
    valueRenderOption: "FORMATTED_VALUE",
  })
  const row = rowRes.data.values?.[0] ?? []
  console.log(`\nRow 108 (411 Scope 1 Level 2) - all ${row.length} cols:`)
  for (let i = 0; i < row.length; i++) {
    console.log(`  col ${i.toString().padStart(3)}: "${row[i]}"`)
  }
}

main().catch((e) => { console.error(e); process.exit(1) })
