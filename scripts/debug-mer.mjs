/**
 * Debug the MER sheet parser - dump the first 15 rows and 20 columns
 * verbatim so we can see exactly what columns the header parser is hitting.
 */
import { google } from "googleapis"
import { GoogleAuth } from "google-auth-library"

const b64 = process.env.GOOGLE_SERVICE_ACCOUNT_KEY_B64
const raw = process.env.GOOGLE_SERVICE_ACCOUNT_KEY
const credentials = b64 ? JSON.parse(Buffer.from(b64, "base64").toString("utf-8")) : JSON.parse(raw)
const auth = new GoogleAuth({
  credentials,
  scopes: ["https://www.googleapis.com/auth/spreadsheets.readonly"],
})
const sheets = google.sheets({ version: "v4", auth })

const id = process.env.GOOGLE_MER_SHEET_ID
const tab = process.env.GOOGLE_MER_TAB ?? "Sheet1"

console.log(`Sheet: ${id}`)
console.log(`Tab: ${tab}`)
console.log()

// First, list all sheets in the workbook (might be on the wrong tab)
const meta = await sheets.spreadsheets.get({ spreadsheetId: id, fields: "sheets.properties" })
console.log("Tabs in this workbook:")
for (const s of meta.data.sheets ?? []) {
  console.log(`  - ${s.properties?.title}  (id=${s.properties?.sheetId}, rows=${s.properties?.gridProperties?.rowCount})`)
}
console.log()

// Now fetch range
const res = await sheets.spreadsheets.values.get({
  spreadsheetId: id,
  range: `${tab}!A1:AZ40`,
  valueRenderOption: "FORMATTED_VALUE",
})
const rows = (res.data.values ?? [])
console.log(`Fetched ${rows.length} rows`)
console.log(`First row (headers) - ${rows[0]?.length} columns:`)
;(rows[0] ?? []).forEach((c, i) => {
  console.log(`  col ${i.toString().padStart(2)}: "${c}"`)
})

console.log("\nFirst 10 rows abbreviated (first 8 cols each):")
for (let i = 0; i < Math.min(rows.length, 15); i++) {
  const r = rows[i] ?? []
  const cells = r.slice(0, 8).map((c) => `"${String(c).slice(0,20)}"`).join(" | ")
  console.log(`  row ${i.toString().padStart(2)}: ${cells}`)
}
