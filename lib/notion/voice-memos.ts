/**
 * Voice Memo Log reader.
 *
 * Voice memos are logged centrally by the n8n voice diary pipeline:
 * WhatsApp -> Twilio -> Deepgram -> Notion (this DB) -> at 4:30pm Claude
 * compiles them into project-specific diary entries.
 *
 * Statuses observed: Received, Processing, Compiled, Processed, Pending.
 */
import {
  queryDataSource,
  getTitle,
  getRichText,
  getSelect,
  getDate,
  getNumber,
  getCreatedTime,
} from "./helpers"

export type VoiceMemo = {
  id: string
  title: string
  date: string | null
  pmName: string | null
  project: string | null
  transcription: string
  status: string | null
  source: string | null
  audioDuration: number | null
  url?: string
  createdAt?: string
}

function db(): string {
  const id = process.env.NOTION_VOICE_MEMO_LOG_DB
  if (!id) throw new Error("NOTION_VOICE_MEMO_LOG_DB not set")
  return id
}

function mapMemo(page: {
  id: string
  properties: Record<string, unknown>
  url?: string
  created_time?: string
}): VoiceMemo {
  const props = page.properties
  return {
    id: page.id,
    title: getTitle(props) || "(no title)",
    date: getDate(props, "Date"),
    pmName: getSelect(props, "PM Name") ?? getSelect(props, "PM"),
    project: getSelect(props, "Project"),
    transcription: getRichText(props, "Transcription"),
    status: getSelect(props, "Status"),
    source: getSelect(props, "Source"),
    audioDuration: getNumber(props, "Audio Duration"),
    url: page.url,
    createdAt: page.created_time ?? getCreatedTime(props) ?? undefined,
  }
}

export async function getRecentVoiceMemos(limit = 10): Promise<VoiceMemo[]> {
  const rows = await queryDataSource({
    databaseId: db(),
    sorts: [{ timestamp: "created_time", direction: "descending" }],
    pageSize: limit,
  })
  return rows.map(mapMemo)
}

export async function getPendingVoiceMemos(): Promise<VoiceMemo[]> {
  const rows = await queryDataSource({
    databaseId: db(),
    filter: {
      or: [
        { property: "Status", select: { equals: "Received" } },
        { property: "Status", select: { equals: "Pending" } },
        { property: "Status", select: { equals: "Processing" } },
      ],
    },
    pageSize: 50,
  })
  return rows.map(mapMemo)
}

export async function getVoiceMemosForToday(): Promise<VoiceMemo[]> {
  const today = new Date().toLocaleDateString("en-CA", { timeZone: "Australia/Sydney" })
  const rows = await queryDataSource({
    databaseId: db(),
    filter: { property: "Date", date: { equals: today } },
    pageSize: 50,
  })
  return rows.map(mapMemo)
}
