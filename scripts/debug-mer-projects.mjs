import { google } from "googleapis"
import { GoogleAuth } from "google-auth-library"
const b64 = process.env.GOOGLE_SERVICE_ACCOUNT_KEY_B64
const credentials = JSON.parse(Buffer.from(b64, "base64").toString("utf-8"))
const auth = new GoogleAuth({ credentials, scopes: ["https://www.googleapis.com/auth/spreadsheets.readonly"] })
const sheets = google.sheets({ version: "v4", auth })

const res = await sheets.spreadsheets.values.get({
  spreadsheetId: process.env.GOOGLE_MER_SHEET_ID,
  range: "Sheet1!A1:E200",
  valueRenderOption: "FORMATTED_VALUE",
})
const rows = res.data.values ?? []
console.log(`${rows.length} rows total`)
// Find rows where col 0 has text but col 1+2 are empty (project headers)
for (let i = 0; i < rows.length; i++) {
  const r = rows[i] ?? []
  if (r[0] && !r[1] && !r[2]) {
    console.log(`  row ${i}: "${r[0]}"`)
  }
}
