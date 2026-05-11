import { Client } from "@notionhq/client"

const key = process.env.NOTION_API_KEY
const c = new Client({ auth: key })

const dbs = {
  Performance: process.env.NOTION_PERFORMANCE_DIARY_DB,
  Subcon: process.env.NOTION_SUBCON_DIARY_DB,
  VoiceMemo: process.env.NOTION_VOICE_MEMO_LOG_DB,
  Defects411: process.env.NOTION_DEFECTS_411_DB,
  GeneralNotes: process.env.NOTION_GENERAL_NOTES_DB,
  Projects: process.env.NOTION_PROJECTS_DB,
}

for (const [name, dsId] of Object.entries(dbs)) {
  if (!dsId) { console.log(`[-] ${name}: env not set`); continue }
  try {
    const res = await c.dataSources.query({ data_source_id: dsId, page_size: 1 })
    console.log(`[+] ${name.padEnd(15)} ${res.results.length} row(s) returned via data_source query`)
  } catch (e) {
    console.log(`[-] ${name.padEnd(15)} ${e.message?.split("\n")[0]?.slice(0, 80)}`)
  }
}
