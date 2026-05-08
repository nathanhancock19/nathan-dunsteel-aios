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

    return { ok: false, error: `Unknown tool: ${name}` }
  } catch (err) {
    return {
      ok: false,
      error: err instanceof Error ? err.message : String(err),
    }
  }
}
