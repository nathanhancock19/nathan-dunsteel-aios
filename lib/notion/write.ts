/**
 * Notion write helpers (AIOS write-back layer).
 *
 * Currently supports:
 *  - addGeneralNote: append a quick note to the General Notes DB
 *  - markDefectStatus: change a Defect's Status field
 *
 * Both functions return the created/updated page ID.
 *
 * Notion v5 SDK: pages are created with `pages.create({ parent: { database_id }, properties })`.
 */
import { notion, getDataSourceId } from "./helpers"

export async function addGeneralNote(args: {
  title: string
  body?: string
  category?: string
  priority?: "Low" | "Medium" | "High"
  project?: string
}): Promise<{ id: string; url: string }> {
  const databaseId = process.env.NOTION_GENERAL_NOTES_DB
  if (!databaseId) throw new Error("NOTION_GENERAL_NOTES_DB not set")
  const client = notion()
  const dataSourceId = await getDataSourceId(databaseId)

  // Build properties dynamically; only include those user supplied so we
  // don't error on missing properties in the target DB.
  const properties: Record<string, unknown> = {
    Name: { title: [{ text: { content: args.title } }] },
  }
  if (args.body) {
    properties.Body = { rich_text: [{ text: { content: args.body } }] }
  }
  if (args.category) {
    properties.Category = { select: { name: args.category } }
  }
  if (args.priority) {
    properties.Priority = { select: { name: args.priority } }
  }
  if (args.project) {
    properties.Project = { select: { name: args.project } }
  }

  const res = await client.pages.create({
    parent: { type: "data_source_id", data_source_id: dataSourceId } as unknown as Parameters<typeof client.pages.create>[0]["parent"],
    properties: properties as Parameters<typeof client.pages.create>[0]["properties"],
  })
  return {
    id: res.id,
    url: "url" in res && typeof res.url === "string" ? res.url : `https://notion.so/${res.id.replaceAll("-", "")}`,
  }
}

/**
 * Update a defect's Status field. Tries `status` property type first,
 * falls back to `select`.
 */
export async function markDefectStatus(args: {
  pageId: string
  status: string
}): Promise<{ ok: boolean; error?: string }> {
  const client = notion()
  // Try as status field first
  try {
    await client.pages.update({
      page_id: args.pageId,
      properties: { Status: { status: { name: args.status } } } as Parameters<typeof client.pages.update>[0]["properties"],
    })
    return { ok: true }
  } catch {
    // Try as select field
    try {
      await client.pages.update({
        page_id: args.pageId,
        properties: { Status: { select: { name: args.status } } } as Parameters<typeof client.pages.update>[0]["properties"],
      })
      return { ok: true }
    } catch (err2) {
      return {
        ok: false,
        error: `Status update failed (tried both status and select types): ${err2 instanceof Error ? err2.message : String(err2)}`,
      }
    }
  }
}
