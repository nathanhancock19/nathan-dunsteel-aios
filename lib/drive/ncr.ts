/**
 * Google Drive reader for the NCR photos folder.
 *
 * Nathan captures NCR photos via WhatsApp -> Google Drive folder. Each photo
 * is named with the assembly number + brief description.
 *
 * Reads file list (name + thumbnail + created date) for end-of-job review
 * and dashboard counts.
 */
import { google } from "googleapis"
import { getGoogleAuth } from "@/lib/google/auth"

export type NcrPhoto = {
  id: string
  name: string
  createdTime: string
  thumbnailLink?: string
  webViewLink?: string
  mimeType: string
  parsedAssembly?: string | null
  parsedDefectType?: string | null
}

function ncrFolderId(): string {
  const id = process.env.GOOGLE_NCR_FOLDER_ID
  if (!id) throw new Error("GOOGLE_NCR_FOLDER_ID not set")
  return id
}

/**
 * Filenames look like "5EB96 cleat welded incorrectly.jpg" or "3EB12-grating-misalignment.png".
 * Best-effort parse: first whitespace/hyphen-bounded token = assembly, rest = defect.
 */
function parseFileName(name: string): { assembly: string | null; defect: string | null } {
  const stem = name.replace(/\.[a-z0-9]{2,5}$/i, "")
  const m = stem.match(/^([A-Z0-9]{2,8})[\s-_]+(.+)$/i)
  if (!m) return { assembly: null, defect: stem }
  return { assembly: m[1]!.toUpperCase(), defect: m[2]!.trim() }
}

export async function listNcrPhotos(opts?: { limit?: number; pageToken?: string }): Promise<{
  photos: NcrPhoto[]
  nextPageToken?: string
}> {
  const auth = getGoogleAuth()
  const drive = google.drive({ version: "v3", auth })
  const limit = opts?.limit ?? 100
  const res = await drive.files.list({
    q: `'${ncrFolderId()}' in parents and trashed = false and mimeType contains 'image/'`,
    pageSize: limit,
    pageToken: opts?.pageToken,
    fields: "nextPageToken, files(id, name, createdTime, thumbnailLink, webViewLink, mimeType)",
    orderBy: "createdTime desc",
  })
  const files = res.data.files ?? []
  const photos: NcrPhoto[] = files.map((f) => {
    const parsed = parseFileName(f.name ?? "")
    return {
      id: f.id ?? "",
      name: f.name ?? "",
      createdTime: f.createdTime ?? "",
      thumbnailLink: f.thumbnailLink ?? undefined,
      webViewLink: f.webViewLink ?? undefined,
      mimeType: f.mimeType ?? "image/jpeg",
      parsedAssembly: parsed.assembly,
      parsedDefectType: parsed.defect,
    }
  })
  return { photos, nextPageToken: res.data.nextPageToken ?? undefined }
}

export async function getNcrSummary(): Promise<{
  total: number
  byDefectType: Record<string, number>
  recent: NcrPhoto[]
}> {
  const { photos } = await listNcrPhotos({ limit: 500 })
  const byDefectType: Record<string, number> = {}
  for (const p of photos) {
    const key = (p.parsedDefectType ?? "unknown").toLowerCase().slice(0, 60)
    byDefectType[key] = (byDefectType[key] ?? 0) + 1
  }
  return { total: photos.length, byDefectType, recent: photos.slice(0, 10) }
}
