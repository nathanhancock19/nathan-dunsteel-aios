/**
 * Monday.com client for AIOS.
 *
 * Monday's API is GraphQL only. AIOS uses it for:
 *  - Workshop board (read schedule)
 *  - PO board (read pending POs, write approval status via change_column_value)
 *
 * Per spec Section 4 Module 5: writes use GraphQL change_column_value (not
 * REST), and we always check for GraphQL errors because Monday returns HTTP
 * 200 even on logical errors.
 */

const MONDAY_API_URL = "https://api.monday.com/v2"

export type MondayGraphQLError = {
  message: string
  locations?: { line: number; column: number }[]
  path?: string[]
  extensions?: Record<string, unknown>
}

export type MondayResponse<T> = {
  data?: T
  errors?: MondayGraphQLError[]
  account_id?: number
}

function getApiKey(): string {
  const key = process.env.MONDAY_API_KEY
  if (!key) throw new Error("MONDAY_API_KEY not set")
  return key
}

export async function mondayQuery<T>(
  query: string,
  variables?: Record<string, unknown>,
): Promise<T> {
  const apiKey = getApiKey()
  const res = await fetch(MONDAY_API_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: apiKey,
      "API-Version": "2024-10",
    },
    body: JSON.stringify({ query, variables }),
    cache: "no-store",
  })

  if (!res.ok) {
    throw new Error(`Monday HTTP ${res.status}: ${await res.text()}`)
  }

  const json = (await res.json()) as MondayResponse<T>
  if (json.errors && json.errors.length > 0) {
    throw new Error(`Monday GraphQL error: ${json.errors.map((e) => e.message).join("; ")}`)
  }
  if (!json.data) {
    throw new Error("Monday returned no data and no errors")
  }
  return json.data
}

export type MondayBoardItem = {
  id: string
  name: string
  state: string
  created_at: string
  updated_at: string
  column_values: Array<{ id: string; type: string; text: string | null; value: string | null }>
}

/**
 * List items on a board. Page-sized, single page for now (Monday boards can
 * be paginated later via cursors when item counts grow).
 */
export async function listBoardItems(boardId: string, limit = 50): Promise<MondayBoardItem[]> {
  const data = await mondayQuery<{ boards: { items_page: { items: MondayBoardItem[] } }[] }>(
    `query ($boardId: [ID!], $limit: Int!) {
      boards(ids: $boardId) {
        items_page(limit: $limit) {
          items {
            id
            name
            state
            created_at
            updated_at
            column_values {
              id
              type
              text
              value
            }
          }
        }
      }
    }`,
    { boardId: [boardId], limit },
  )
  return data.boards[0]?.items_page.items ?? []
}

/**
 * Update a single column on an item. Used for PO approve/query write-backs.
 * Per spec, always returns the new value so we can confirm. Throws on any
 * GraphQL error.
 */
export async function changeColumnValue(args: {
  boardId: string
  itemId: string
  columnId: string
  value: string
}): Promise<{ id: string }> {
  const data = await mondayQuery<{ change_column_value: { id: string } }>(
    `mutation ($boardId: ID!, $itemId: ID!, $columnId: String!, $value: JSON!) {
      change_column_value(board_id: $boardId, item_id: $itemId, column_id: $columnId, value: $value) {
        id
      }
    }`,
    {
      boardId: args.boardId,
      itemId: args.itemId,
      columnId: args.columnId,
      value: args.value,
    },
  )
  return data.change_column_value
}

/**
 * One option from a Monday dropdown or status column. `id` is the numeric
 * label id (used for dropdown writes), `label` is the human-readable string
 * (used for status writes).
 */
export type ColumnOption = { id: number; label: string }

type RawColumn = { id: string; type: string; settings_str: string | null }

/**
 * Read the options available on one or more dropdown / status columns of a
 * board. Used to populate allocation pickers (Job/Scope, Cost Code) without
 * hard-coding the lists.
 *
 * Returns a map keyed by columnId. Unknown column ids return [].
 *
 * Dropdown columns store options as `settings.labels = [{id, name}]`.
 * Status/color columns store options as `settings.labels = { "0": "name", ... }`.
 */
export async function getColumnOptions(
  boardId: string,
  columnIds: string[],
): Promise<Record<string, ColumnOption[]>> {
  const data = await mondayQuery<{ boards: { columns: RawColumn[] }[] }>(
    `query ($boardId: [ID!]) {
      boards(ids: $boardId) {
        columns {
          id
          type
          settings_str
        }
      }
    }`,
    { boardId: [boardId] },
  )

  const cols = data.boards[0]?.columns ?? []
  const out: Record<string, ColumnOption[]> = {}

  for (const id of columnIds) {
    const col = cols.find((c) => c.id === id)
    if (!col || !col.settings_str) {
      out[id] = []
      continue
    }
    let settings: { labels?: unknown }
    try {
      settings = JSON.parse(col.settings_str) as { labels?: unknown }
    } catch {
      out[id] = []
      continue
    }

    if (col.type === "dropdown" && Array.isArray(settings.labels)) {
      out[id] = (settings.labels as Array<{ id: number; name: string }>).map((l) => ({
        id: l.id,
        label: l.name,
      }))
    } else if (
      (col.type === "color" || col.type === "status") &&
      settings.labels &&
      typeof settings.labels === "object" &&
      !Array.isArray(settings.labels)
    ) {
      const labels = settings.labels as Record<string, string>
      out[id] = Object.entries(labels).map(([labelId, label]) => ({
        id: Number(labelId),
        label,
      }))
    } else {
      out[id] = []
    }
  }
  return out
}

export async function pingMonday(): Promise<{ ok: boolean; error?: string }> {
  try {
    await mondayQuery<{ me: { id: string } }>(`query { me { id } }`)
    return { ok: true }
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : String(err) }
  }
}
