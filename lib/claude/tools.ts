/**
 * Read-only tools the AI Assistant can call. Each tool has:
 *  - definition: the JSON-schema-like shape Claude sees
 *  - handler: server-side execution that returns a JSON-serialisable result
 *
 * All tools respect AIOS_PRIMARY_PROJECT_NUMBER scope where relevant.
 * No tool may write to any system in v1.
 */

import { z } from "zod"
import { listRecords, TABLES } from "@/lib/airtable"
import { getTodayDockets } from "@/lib/airtable"
import { getDeliveriesForDay } from "@/lib/sheets/deliveries"
import { getProjectForecast } from "@/lib/notion/forecast"
import { changeColumnValue } from "@/lib/monday"
import { logDecision } from "@/lib/decisions/log"
import { runInbox } from "@/lib/inbox"
import {
  getDiaryEntriesForDate,
  getRecentDiaryEntries,
  getDiaryFlaggedEntries,
  getUninvoicedSubconEntries,
} from "@/lib/notion/diary"
import { getDefectsSummary, getDefectsList, getOpenHighSeverityDefects } from "@/lib/notion/defects"
import { getHighPriorityNotes, getGeneralNotes } from "@/lib/notion/general-notes"
import { getPendingVoiceMemos } from "@/lib/notion/voice-memos"
import { addGeneralNote, markDefectStatus } from "@/lib/notion/write"
import { getMerSummary, getMerScopes, getMerClaimsForMonth, getMerSyncStatus } from "@/lib/strumis/queries"
import { listWorkflows, getRecentFailures } from "@/lib/n8n/client"
import { getCategorisedMessages, outlookConfigured } from "@/lib/outlook/client"
import { listVariations, createVariationDraft } from "@/lib/airtable/variations"
import { getNcrSummary } from "@/lib/drive/ncr"
import type Anthropic from "@anthropic-ai/sdk"

type ToolDefinition = Anthropic.Tool

const projectScope = () => process.env.AIOS_PRIMARY_PROJECT_NUMBER

export const queryDocketsSchema = z.object({
  date: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/)
    .optional()
    .describe("YYYY-MM-DD. Defaults to today."),
  status: z.enum(["Draft", "Submitted", "Approved", "Rejected"]).optional(),
  limit: z.number().int().min(1).max(50).default(10),
})

export const queryProjectsSchema = z.object({
  search: z.string().optional().describe("Substring match on Project Number or Strumus Name."),
  limit: z.number().int().min(1).max(50).default(10),
})

export const todaySiteActivitySchema = z.object({})

export const queryDeliveriesSchema = z.object({
  date: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/)
    .optional()
    .describe("YYYY-MM-DD. Defaults to today."),
})

export const approvePOSchema = z.object({
  itemId: z.string().min(1).describe("Monday item id of the PO."),
  name: z.string().optional().describe("Display name of the PO for the Telegram notification."),
  jobScopeId: z.number().int().optional().describe("Optional dropdown label id for Job/Scope."),
  costCodeLabel: z.string().optional().describe("Optional status label for Cost Code."),
  confirmed: z.literal(true).describe("Caller has confirmed with the user before invoking. Always set to true."),
})

export const allocatePOSchema = z.object({
  itemId: z.string().min(1),
  jobScopeId: z.number().int().optional(),
  costCodeLabel: z.string().optional(),
  confirmed: z.literal(true),
})

export const logDecisionSchema = z.object({
  category: z
    .string()
    .min(1)
    .describe("e.g. 'note', 'commitment', 'reminder'. Use 'note' as default."),
  subject: z.string().optional().describe("Person or project this decision is about, if applicable."),
  body: z.string().min(1).describe("Free-form text describing what happened or what was decided."),
})

export const queryDiaryDateSchema = z.object({
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
})
export const queryClaimsForMonthSchema = z.object({
  yearMonth: z.string().regex(/^\d{4}-\d{2}$/).optional(),
})
export const queryDefectsListSchema = z.object({
  status: z.string().optional(),
  limit: z.number().int().min(1).max(50).default(10),
})
export const queryNotesSchema = z.object({
  category: z.string().optional(),
  priority: z.enum(["Low", "Medium", "High"]).optional(),
  status: z.string().optional(),
  limit: z.number().int().min(1).max(50).default(10),
})
export const addNoteSchema = z.object({
  title: z.string().min(1).max(200),
  body: z.string().max(5000).optional(),
  category: z.string().optional(),
  priority: z.enum(["Low", "Medium", "High"]).optional(),
  confirmed: z.literal(true),
})
export const markDefectSchema = z.object({
  pageId: z.string().min(1),
  status: z.string().min(1),
  confirmed: z.literal(true),
})
export const createVariationSchema = z.object({
  variationNumber: z.string().min(1).max(20),
  title: z.string().min(1).max(200),
  confirmed: z.literal(true),
})

export const tools: ToolDefinition[] = [
  {
    name: "get_project_forecast",
    description:
      "Read Nathan's Project Forecast Notion table. The forecast is updated weekly and lists upcoming work for the project: dates, scope, status. Use this for questions about upcoming work, what's planned next week, project schedule, or remaining milestones.",
    input_schema: {
      type: "object",
      properties: {},
      required: [],
    } as Anthropic.Tool["input_schema"],
  },
  {
    name: "query_deliveries",
    description:
      "Get the delivery schedule for a given day from the Dunsteel Google Sheets delivery tracker. Returns up to 5 jobs (project, details, truck, time, signed status, PM). Scoped to the user's primary project. Use this when the user asks about deliveries, what's coming on a date, or what's scheduled.",
    input_schema: {
      type: "object",
      properties: {
        date: {
          type: "string",
          description: "Filter to a specific date in YYYY-MM-DD format. Omit for today.",
        },
      },
      required: [],
    } as Anthropic.Tool["input_schema"],
  },
  {
    name: "today_site_activity",
    description:
      "Get a summary of dockets submitted today: count of dockets, distinct projects on site, distinct subcontractor companies on site, total worker entries. Scoped to the user's primary project.",
    input_schema: {
      type: "object",
      properties: {},
      required: [],
    } as Anthropic.Tool["input_schema"],
  },
  {
    name: "query_dockets",
    description:
      "List Day Dockets matching optional filters. Returns docket reference, date, project, status, and worker count per record. Scoped to the user's primary project. Use this when the user asks about specific dockets, recent submissions, who's been on site, or anything historical about dockets.",
    input_schema: {
      type: "object",
      properties: {
        date: {
          type: "string",
          description: "Filter to a single date in YYYY-MM-DD format. Omit to see all dates.",
        },
        status: {
          type: "string",
          enum: ["Draft", "Submitted", "Approved", "Rejected"],
          description: "Filter to dockets in this status.",
        },
        limit: {
          type: "integer",
          description: "Max records to return, 1-50. Default 10.",
        },
      },
      required: [],
    } as Anthropic.Tool["input_schema"],
  },
  {
    name: "query_projects",
    description:
      "List projects from the shared Airtable base. Returns project number, name, status, and PM. Use this for project-level questions. By default scoped to the user's primary project unless the search argument is supplied.",
    input_schema: {
      type: "object",
      properties: {
        search: {
          type: "string",
          description: "Substring match on project number (e.g. '411') or Strumus name. Omit to default to the user's primary project.",
        },
        limit: {
          type: "integer",
          description: "Max records to return, 1-50. Default 10.",
        },
      },
      required: [],
    } as Anthropic.Tool["input_schema"],
  },
  {
    name: "query_inbox",
    description:
      "Read the current inbox (what needs Nathan today). Returns each item's source, urgency, title and context. Use this when the user asks 'what's outstanding', 'what's pending today', or wants you to triage a batch of items.",
    input_schema: {
      type: "object",
      properties: {},
      required: [],
    } as Anthropic.Tool["input_schema"],
  },
  {
    name: "monday_approve_po",
    description:
      "Approve a PO on the Monday board, optionally setting Job/Scope and Cost Code at the same time. WRITE TOOL: only invoke after the user has explicitly confirmed (e.g. 'yes', 'go ahead', 'approve it'). Echo back the supplier name, allocation, and ask 'approve now?' before calling. Always pass confirmed: true.",
    input_schema: {
      type: "object",
      properties: {
        itemId: { type: "string", description: "Monday item id of the PO." },
        name: { type: "string", description: "PO display name for the Telegram log." },
        jobScopeId: {
          type: "integer",
          description: "Optional dropdown label id for Job/Scope (multi_select6).",
        },
        costCodeLabel: {
          type: "string",
          description: "Optional status label for Cost Code (single_select).",
        },
        confirmed: {
          type: "boolean",
          description: "Always true. The caller (you) is confirming the user has approved this write.",
        },
      },
      required: ["itemId", "confirmed"],
    } as Anthropic.Tool["input_schema"],
  },
  {
    name: "monday_set_po_allocation",
    description:
      "Set Job/Scope and/or Cost Code on a PO without flipping its status. WRITE TOOL: confirm with the user before calling. Useful when Nathan wants to allocate a PO but isn't ready to approve it yet.",
    input_schema: {
      type: "object",
      properties: {
        itemId: { type: "string" },
        jobScopeId: { type: "integer" },
        costCodeLabel: { type: "string" },
        confirmed: { type: "boolean" },
      },
      required: ["itemId", "confirmed"],
    } as Anthropic.Tool["input_schema"],
  },
  {
    name: "aios_log_decision",
    description:
      "Append a free-form note or commitment to the AIOS decision log. Use this when Nathan says 'remind me later that ...' or 'note that I decided to ...'. WRITE TOOL but low-risk: stores in our own database, no external side effects.",
    input_schema: {
      type: "object",
      properties: {
        category: {
          type: "string",
          description: "Short category, e.g. 'note', 'commitment', 'reminder'.",
        },
        subject: {
          type: "string",
          description: "Optional: who or what the decision is about.",
        },
        body: {
          type: "string",
          description: "What was decided or noted.",
        },
      },
      required: ["category", "body"],
    } as Anthropic.Tool["input_schema"],
  },

  // ===== Diary tools =====
  {
    name: "query_diary_today",
    description:
      "Get today's site diary entries (Performance Site Diary + Subcontractors Diary) for the user's primary project. Returns work completed, weather, hours lost, crew, plus safety incident / builder delay flags. Use when asked 'what happened today on site', 'today's diary', or summarising the day.",
    input_schema: { type: "object", properties: { date: { type: "string", description: "YYYY-MM-DD; defaults to today." } }, required: [] } as Anthropic.Tool["input_schema"],
  },
  {
    name: "query_diary_recent",
    description: "Get recent (last ~10) site diary entries across both diaries. Use for 'what's been happening this week' or 'recent diary' queries.",
    input_schema: { type: "object", properties: {}, required: [] } as Anthropic.Tool["input_schema"],
  },
  {
    name: "query_diary_flagged",
    description: "Get diary entries from the last 14 days flagged for safety incident or builder delay. Use when asked about risks, incidents, or what's gone wrong.",
    input_schema: { type: "object", properties: {}, required: [] } as Anthropic.Tool["input_schema"],
  },
  {
    name: "query_voice_memos_pending",
    description: "List voice memos in the central Voice Memo Log that are awaiting compilation (status Received / Pending / Processing). Use to confirm whether all today's WhatsApp memos have been picked up.",
    input_schema: { type: "object", properties: {}, required: [] } as Anthropic.Tool["input_schema"],
  },

  // ===== Defects tools =====
  {
    name: "query_defects_summary",
    description: "Get summary counts of defects on Project 411: total, by status, by severity, and total cost impact. Use for 'how many defects' / 'overall defects state' queries.",
    input_schema: { type: "object", properties: {}, required: [] } as Anthropic.Tool["input_schema"],
  },
  {
    name: "query_defects_open",
    description: "List currently open high-severity defects on Project 411 (severity High/Critical, status not Rectified or Deferred). Use when asked 'what defects need attention' or 'biggest defects to fix'.",
    input_schema: { type: "object", properties: {}, required: [] } as Anthropic.Tool["input_schema"],
  },
  {
    name: "query_defects_list",
    description: "List defects on Project 411 with optional status filter. Use for queries about specific defects or recent additions.",
    input_schema: {
      type: "object",
      properties: {
        status: { type: "string", description: "Filter (e.g. Identified, In Progress, Rectified, Deferred)." },
        limit: { type: "integer", description: "Max records, default 10." },
      },
      required: [],
    } as Anthropic.Tool["input_schema"],
  },

  // ===== Notes tools =====
  {
    name: "query_high_priority_notes",
    description: "Get the user's high-priority notes from Notion General Notes for their primary project (excludes Done items). Use when asked 'what's on my plate' or 'high priority items'.",
    input_schema: { type: "object", properties: {}, required: [] } as Anthropic.Tool["input_schema"],
  },
  {
    name: "query_notes",
    description: "List Notion General Notes filtered by category/priority/status for the user's primary project. Use for category-specific queries (e.g. 'Safety notes', 'In Progress Commercial items').",
    input_schema: {
      type: "object",
      properties: {
        category: { type: "string" },
        priority: { type: "string", enum: ["Low", "Medium", "High"] },
        status: { type: "string" },
        limit: { type: "integer" },
      },
      required: [],
    } as Anthropic.Tool["input_schema"],
  },

  // ===== Subcon billing tool =====
  {
    name: "query_uninvoiced_subcon",
    description: "List Dunsteel Subcontractors Diary entries marked Not Invoiced. Use when chasing billing or asked 'what subcon entries are still pending invoice'.",
    input_schema: { type: "object", properties: {}, required: [] } as Anthropic.Tool["input_schema"],
  },

  // ===== Budget / MER tools (claims/revenue side) =====
  {
    name: "query_claims_summary",
    description: "Get the MER claims summary for the user's primary project: total contract value, claimed to date, remaining, claimed this month, variations count and value. Use for 'how am I tracking on claims', 'overall budget claims position'.",
    input_schema: { type: "object", properties: {}, required: [] } as Anthropic.Tool["input_schema"],
  },
  {
    name: "query_claims_for_month",
    description: "Get the MER claims schedule for a specific month (year-month, e.g. '2026-05'). Returns each scope's planned claim percentage and remaining value for that month. Use for forward-looking questions about expected revenue.",
    input_schema: {
      type: "object",
      properties: { yearMonth: { type: "string", description: "YYYY-MM format (e.g. 2026-05). Defaults to current month." } },
      required: [],
    } as Anthropic.Tool["input_schema"],
  },
  {
    name: "query_claims_scopes",
    description: "List all scopes in the MER for the user's primary project with overall value, claimed % to date, and remaining value. Includes variations (V01-V14) flagged separately.",
    input_schema: { type: "object", properties: {}, required: [] } as Anthropic.Tool["input_schema"],
  },
  {
    name: "query_mer_sync_status",
    description: "Check when the MER was last synced from the Google Sheet. Use to verify freshness before quoting claims figures.",
    input_schema: { type: "object", properties: {}, required: [] } as Anthropic.Tool["input_schema"],
  },

  // ===== n8n workflow tools =====
  {
    name: "query_n8n_workflows",
    description: "List Dunsteel n8n workflows with active/inactive state. Use for system health questions about automation pipelines (voice diary, SWMS, WF5, NCR, workshop, deliveries).",
    input_schema: { type: "object", properties: {}, required: [] } as Anthropic.Tool["input_schema"],
  },
  {
    name: "query_n8n_failures",
    description: "List recent failed n8n workflow executions. Use when asked 'what's broken' or 'any pipeline failures'.",
    input_schema: { type: "object", properties: {}, required: [] } as Anthropic.Tool["input_schema"],
  },

  // ===== Outlook tools (graceful degrade) =====
  {
    name: "query_outlook_flagged",
    description: "List Outlook emails flagged 'Needs Reply', 'To Be Discussed' or 'Urgent' (categorised by Nathan). If Outlook integration is not configured, returns an empty list with a configured: false flag.",
    input_schema: { type: "object", properties: {}, required: [] } as Anthropic.Tool["input_schema"],
  },

  // ===== Variations tools =====
  {
    name: "query_variations",
    description: "List variations submitted/pending for the user's primary project, with status and total. Use for 'what variations are open' or 'my variation pipeline' queries.",
    input_schema: { type: "object", properties: {}, required: [] } as Anthropic.Tool["input_schema"],
  },
  {
    name: "create_variation_draft",
    description:
      "Create a new variation draft in Airtable with just a number and title (no line items yet). WRITE TOOL: only invoke after user explicitly confirms (e.g. 'yes create it'). Always pass confirmed: true. Caller must add line items via the /variations UI afterwards.",
    input_schema: {
      type: "object",
      properties: {
        variationNumber: { type: "string", description: "e.g. V-411-016" },
        title: { type: "string", description: "Short title visible to AW Edwards" },
        confirmed: { type: "boolean", description: "Always true. Caller has confirmed with user." },
      },
      required: ["variationNumber", "title", "confirmed"],
    } as Anthropic.Tool["input_schema"],
  },

  // ===== NCR tools =====
  {
    name: "query_ncr_summary",
    description: "Get summary of NCR photos captured via WhatsApp -> Drive: total count plus breakdown by parsed defect type. Use for end-of-job review or 'what defects are most common'.",
    input_schema: { type: "object", properties: {}, required: [] } as Anthropic.Tool["input_schema"],
  },

  // ===== Notion write tools =====
  {
    name: "add_note_to_notion",
    description:
      "Append a note to the Notion General Notes database for the user's primary project. WRITE TOOL: only invoke after the user explicitly confirms wording. Always pass confirmed: true.",
    input_schema: {
      type: "object",
      properties: {
        title: { type: "string" },
        body: { type: "string" },
        category: { type: "string", description: "Optional: General/Site/Commercial/Delivery/Safety/QA/Programme/Costing." },
        priority: { type: "string", enum: ["Low", "Medium", "High"] },
        confirmed: { type: "boolean" },
      },
      required: ["title", "confirmed"],
    } as Anthropic.Tool["input_schema"],
  },
  {
    name: "mark_defect_status",
    description:
      "Update a defect's Status field (e.g. Rectified, In Progress, Deferred). WRITE TOOL: confirm with user first. Always pass confirmed: true.",
    input_schema: {
      type: "object",
      properties: {
        pageId: { type: "string", description: "Notion page ID of the defect." },
        status: { type: "string", description: "New status, e.g. Rectified." },
        confirmed: { type: "boolean" },
      },
      required: ["pageId", "status", "confirmed"],
    } as Anthropic.Tool["input_schema"],
  },
]

type ToolResult =
  | { ok: true; data: unknown }
  | { ok: false; error: string }

export async function runTool(name: string, input: unknown): Promise<ToolResult> {
  try {
    if (name === "get_project_forecast") {
      const forecast = await getProjectForecast()
      if (!forecast) {
        return { ok: false, error: "NOTION_FORECAST_PAGE_ID not set" }
      }
      return { ok: true, data: forecast }
    }

    if (name === "query_deliveries") {
      const args = queryDeliveriesSchema.parse(input)
      const result = await getDeliveriesForDay({
        date: args.date,
        projectFilter: projectScope(),
      })
      return {
        ok: true,
        data: {
          date: result.date,
          dayName: result.dayName,
          monthLabel: result.monthLabel,
          count: result.jobs.length,
          jobs: result.jobs.map((j) => ({
            project: j.project || null,
            details: j.details,
            truck: j.truck ?? null,
            time: j.time ?? null,
            pm: j.pm ?? null,
            signed: j.signedDocket ?? null,
            status: j.status ?? null,
          })),
        },
      }
    }

    if (name === "today_site_activity") {
      const dockets = await getTodayDockets()
      return {
        ok: true,
        data: {
          count: dockets.length,
          dockets: dockets.map((d) => ({
            ref: d.ref,
            status: d.status,
            workers: d.workerEntryCount,
          })),
        },
      }
    }

    if (name === "query_dockets") {
      const args = queryDocketsSchema.parse(input)
      const clauses: string[] = []
      if (args.date) clauses.push(`IS_SAME({Date}, "${args.date}", "day")`)
      if (args.status) clauses.push(`{Status} = "${args.status}"`)
      const project = projectScope()
      if (project) clauses.push(`FIND("${project}", ARRAYJOIN({Project}, ","))`)
      const formula =
        clauses.length === 0
          ? ""
          : clauses.length === 1
          ? clauses[0]
          : `AND(${clauses.join(", ")})`
      const records = await listRecords(TABLES.DAY_DOCKETS, {
        filterByFormula: formula,
        maxRecords: args.limit,
        sort: [{ field: "Date", direction: "desc" }],
      })
      return {
        ok: true,
        data: records.map((r) => ({
          ref: String(r.fields["Docket Ref"] ?? ""),
          date: String(r.fields.Date ?? ""),
          status: String(r.fields.Status ?? ""),
          hourType: String(r.fields["Hour Type"] ?? ""),
          workers: Array.isArray(r.fields["Worker Entries"])
            ? (r.fields["Worker Entries"] as string[]).length
            : 0,
        })),
      }
    }

    if (name === "query_projects") {
      const args = queryProjectsSchema.parse(input)
      let formula = ""
      if (args.search) {
        formula = `OR(FIND("${args.search}", {Project Number}), FIND("${args.search}", {Strumus Name}))`
      } else if (projectScope()) {
        formula = `FIND("${projectScope()}", {Project Number})`
      }
      const records = await listRecords(TABLES.PROJECTS, {
        filterByFormula: formula,
        maxRecords: args.limit,
        fields: ["Project Number", "Strumus Name", "Status", "PM Assigned"],
      })
      return {
        ok: true,
        data: records.map((r) => ({
          number: String(r.fields["Project Number"] ?? ""),
          name: String(r.fields["Strumus Name"] ?? ""),
          status: String(r.fields["Status"] ?? ""),
          pm: Array.isArray(r.fields["PM Assigned"])
            ? (r.fields["PM Assigned"] as string[]).join(", ")
            : String(r.fields["PM Assigned"] ?? ""),
        })),
      }
    }

    if (name === "query_inbox") {
      const items = await runInbox()
      return {
        ok: true,
        data: items.map((i) => ({
          id: i.id,
          source: i.source,
          urgency: i.urgency,
          title: i.title,
          context: i.context,
        })),
      }
    }

    if (name === "monday_approve_po") {
      const args = approvePOSchema.parse(input)
      const boardId = process.env.MONDAY_PO_BOARD_ID
      if (!boardId) return { ok: false, error: "MONDAY_PO_BOARD_ID not set" }

      if (typeof args.jobScopeId === "number") {
        await changeColumnValue({
          boardId,
          itemId: args.itemId,
          columnId: "multi_select6",
          value: JSON.stringify({ ids: [args.jobScopeId] }),
        })
      }
      if (args.costCodeLabel) {
        await changeColumnValue({
          boardId,
          itemId: args.itemId,
          columnId: "single_select",
          value: JSON.stringify({ label: args.costCodeLabel }),
        })
      }
      await changeColumnValue({
        boardId,
        itemId: args.itemId,
        columnId: "status",
        value: JSON.stringify({ label: "Approved" }),
      })

      await logDecision({
        actor: "assistant",
        category: "po-approval",
        subject: args.name ?? args.itemId,
        body: {
          itemId: args.itemId,
          jobScopeId: args.jobScopeId ?? null,
          costCodeLabel: args.costCodeLabel ?? null,
        },
        sourceId: args.itemId,
      })

      return { ok: true, data: { approved: true, itemId: args.itemId } }
    }

    if (name === "monday_set_po_allocation") {
      const args = allocatePOSchema.parse(input)
      const boardId = process.env.MONDAY_PO_BOARD_ID
      if (!boardId) return { ok: false, error: "MONDAY_PO_BOARD_ID not set" }

      const writes: string[] = []
      if (typeof args.jobScopeId === "number") {
        await changeColumnValue({
          boardId,
          itemId: args.itemId,
          columnId: "multi_select6",
          value: JSON.stringify({ ids: [args.jobScopeId] }),
        })
        writes.push("jobScope")
      }
      if (args.costCodeLabel) {
        await changeColumnValue({
          boardId,
          itemId: args.itemId,
          columnId: "single_select",
          value: JSON.stringify({ label: args.costCodeLabel }),
        })
        writes.push("costCode")
      }

      await logDecision({
        actor: "assistant",
        category: "po-allocation",
        subject: args.itemId,
        body: {
          itemId: args.itemId,
          jobScopeId: args.jobScopeId ?? null,
          costCodeLabel: args.costCodeLabel ?? null,
        },
        sourceId: args.itemId,
      })

      return { ok: true, data: { allocated: writes, itemId: args.itemId } }
    }

    if (name === "aios_log_decision") {
      const args = logDecisionSchema.parse(input)
      const result = await logDecision({
        actor: "assistant",
        category: args.category,
        subject: args.subject,
        body: { text: args.body },
      })
      return result.ok
        ? { ok: true, data: { logged: true } }
        : { ok: false, error: "Decision log not configured (POSTGRES_URL missing)" }
    }

    // ===== New tools (Cycles 1-3) =====
    if (name === "query_diary_today") {
      const args = queryDiaryDateSchema.parse(input)
      const entries = await getDiaryEntriesForDate({ date: args.date })
      return { ok: true, data: entries }
    }
    if (name === "query_diary_recent") {
      const entries = await getRecentDiaryEntries(10)
      return { ok: true, data: entries }
    }
    if (name === "query_diary_flagged") {
      const entries = await getDiaryFlaggedEntries({ days: 14 })
      return { ok: true, data: entries }
    }
    if (name === "query_voice_memos_pending") {
      const memos = await getPendingVoiceMemos()
      return { ok: true, data: memos }
    }

    if (name === "query_defects_summary") {
      const summary = await getDefectsSummary()
      return { ok: true, data: summary }
    }
    if (name === "query_defects_open") {
      const defects = await getOpenHighSeverityDefects()
      return { ok: true, data: defects }
    }
    if (name === "query_defects_list") {
      const args = queryDefectsListSchema.parse(input)
      const defects = await getDefectsList({ status: args.status, limit: args.limit })
      return { ok: true, data: defects }
    }

    if (name === "query_high_priority_notes") {
      const notes = await getHighPriorityNotes(projectScope() ?? undefined)
      return { ok: true, data: notes }
    }
    if (name === "query_notes") {
      const args = queryNotesSchema.parse(input)
      const notes = await getGeneralNotes({
        project: projectScope() ?? undefined,
        category: args.category,
        priority: args.priority,
        status: args.status,
        limit: args.limit,
      })
      return { ok: true, data: notes }
    }

    if (name === "query_uninvoiced_subcon") {
      const entries = await getUninvoicedSubconEntries(50)
      return { ok: true, data: { count: entries.length, entries } }
    }

    if (name === "query_claims_summary") {
      const summary = await getMerSummary()
      return { ok: true, data: summary }
    }
    if (name === "query_claims_for_month") {
      const args = queryClaimsForMonthSchema.parse(input)
      const ym = args.yearMonth ?? `${new Date().getUTCFullYear()}-${String(new Date().getUTCMonth() + 1).padStart(2, "0")}`
      const claims = await getMerClaimsForMonth(ym)
      return { ok: true, data: { yearMonth: ym, claims } }
    }
    if (name === "query_claims_scopes") {
      const scopes = await getMerScopes()
      return { ok: true, data: scopes }
    }
    if (name === "query_mer_sync_status") {
      const status = await getMerSyncStatus()
      return { ok: true, data: status }
    }

    if (name === "query_n8n_workflows") {
      const workflows = await listWorkflows()
      return { ok: true, data: workflows }
    }
    if (name === "query_n8n_failures") {
      const failures = await getRecentFailures(10)
      return { ok: true, data: failures }
    }

    if (name === "query_outlook_flagged") {
      if (!outlookConfigured()) {
        return { ok: true, data: { configured: false, messages: [] } }
      }
      const messages = await getCategorisedMessages({ limit: 10 })
      return { ok: true, data: { configured: true, messages } }
    }

    if (name === "query_variations") {
      const variations = await listVariations({ limit: 50 })
      return { ok: true, data: variations }
    }
    if (name === "create_variation_draft") {
      const args = createVariationSchema.parse(input)
      // Resolve project ID
      const project = projectScope() ?? "411"
      const records = await listRecords(TABLES.PROJECTS, {
        filterByFormula: `FIND("${project}", {Project Number})`,
        maxRecords: 1,
        fields: ["Project Number"],
      })
      const projectId = records[0]?.id
      if (!projectId) return { ok: false, error: "Could not resolve project ID" }
      const v = await createVariationDraft({
        variationNumber: args.variationNumber,
        title: args.title,
        projectId,
      })
      await logDecision({
        actor: "assistant",
        category: "variation-draft",
        subject: project,
        body: { variationNumber: args.variationNumber, title: args.title, airtableId: v.id },
        sourceId: v.id,
      })
      return { ok: true, data: v }
    }

    if (name === "query_ncr_summary") {
      if (!process.env.GOOGLE_NCR_FOLDER_ID) {
        return { ok: false, error: "GOOGLE_NCR_FOLDER_ID not set" }
      }
      const summary = await getNcrSummary()
      return { ok: true, data: summary }
    }

    if (name === "add_note_to_notion") {
      const args = addNoteSchema.parse(input)
      const note = await addGeneralNote({
        title: args.title,
        body: args.body,
        category: args.category,
        priority: args.priority,
        project: projectScope() ?? undefined,
      })
      await logDecision({
        actor: "assistant",
        category: "note-write",
        subject: projectScope() ?? null,
        body: { title: args.title, notionPageId: note.id },
        sourceId: note.id,
      } as Parameters<typeof logDecision>[0])
      return { ok: true, data: note }
    }
    if (name === "mark_defect_status") {
      const args = markDefectSchema.parse(input)
      const result = await markDefectStatus({ pageId: args.pageId, status: args.status })
      if (!result.ok) return { ok: false, error: result.error ?? "unknown error" }
      await logDecision({
        actor: "assistant",
        category: "defect-status-write",
        body: { pageId: args.pageId, status: args.status },
        sourceId: args.pageId,
      } as Parameters<typeof logDecision>[0])
      return { ok: true, data: { updated: true, pageId: args.pageId, status: args.status } }
    }

    return { ok: false, error: `Unknown tool: ${name}` }
  } catch (err) {
    return {
      ok: false,
      error: err instanceof Error ? err.message : String(err),
    }
  }
}
