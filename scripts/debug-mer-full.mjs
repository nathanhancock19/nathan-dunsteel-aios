import { google } from "googleapis"
import { GoogleAuth } from "google-auth-library"

const b64 = process.env.GOOGLE_SERVICE_ACCOUNT_KEY_B64
const credentials = b64 ? JSON.parse(Buffer.from(b64, "base64").toString("utf-8")) : JSON.parse(process.env.GOOGLE_SERVICE_ACCOUNT_KEY)
const auth = new GoogleAuth({ credentials, scopes: ["https://www.googleapis.com/auth/spreadsheets.readonly"] })
const sheets = google.sheets({ version: "v4", auth })

const res = await sheets.spreadsheets.values.get({
  spreadsheetId: process.env.GOOGLE_MER_SHEET_ID,
  range: "Sheet1!A1:CN40",
  valueRenderOption: "FORMATTED_VALUE",
})
const rows = res.data.values ?? []

console.log("Row 1 (month labels) - non-empty cells:")
;(rows[1] ?? []).forEach((c, i) => { if (c) console.log(`  col ${i}: "${c}"`) })

console.log("\nRow 2 (static headers) - non-empty cells:")
;(rows[2] ?? []).forEach((c, i) => { if (c) console.log(`  col ${i}: "${c}"`) })

console.log("\nRow 4 (Scope 1 data) - first 30 cols:")
const r = rows[4] ?? []
for (let i = 0; i < Math.min(30, r.length); i++) console.log(`  col ${i}: "${r[i]}"`)

// Find 411 in the project header rows
console.log("\nProject header rows (Job filled, no Scope value):")
for (let i = 3; i < rows.length; i++) {
  const r2 = rows[i] ?? []
  if (r2[0] && !r2[1] && !r2[2]) console.log(`  row ${i}: "${r2[0]}"`)
}
