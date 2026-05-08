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

export const tools: ToolDefinition[] = [
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
]

type ToolResult =
  | { ok: true; data: unknown }
  | { ok: false; error: string }

export async function runTool(name: string, input: unknown): Promise<ToolResult> {
  try {
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

    return { ok: false, error: `Unknown tool: ${name}` }
  } catch (err) {
    return {
      ok: false,
      error: err instanceof Error ? err.message : String(err),
    }
  }
}
