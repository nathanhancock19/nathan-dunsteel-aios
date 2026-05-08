/**
 * Streaming chat endpoint for the AIOS AI Assistant.
 *
 * Wire format: server-sent events. Each line starts with "data: " followed
 * by a JSON object:
 *   { type: "text", text: "..."  }   incremental text
 *   { type: "tool_use", name, input } a tool was invoked (UI may show)
 *   { type: "tool_result", name, ok, summary } tool finished
 *   { type: "done" }                 final
 *   { type: "error", error }         fatal
 */

import { auth } from "@/lib/auth"
import { getClaude, SYSTEM_PROMPT, ASSISTANT_MODEL, ASSISTANT_MAX_TOKENS, ASSISTANT_TEMPERATURE } from "@/lib/claude/client"
import { tools, runTool } from "@/lib/claude/tools"
import { runInbox } from "@/lib/inbox"
import { recentDecisions } from "@/lib/decisions/log"
import type Anthropic from "@anthropic-ai/sdk"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

type ClientMessage = { role: "user" | "assistant"; content: string }

export async function POST(req: Request) {
  const session = await auth()
  if (!session) return new Response("Unauthorized", { status: 401 })

  let body: { messages: ClientMessage[] }
  try {
    body = (await req.json()) as { messages: ClientMessage[] }
  } catch {
    return new Response("Bad JSON", { status: 400 })
  }
  if (!Array.isArray(body.messages) || body.messages.length === 0) {
    return new Response("messages required", { status: 400 })
  }

  const messages: Anthropic.MessageParam[] = body.messages.map((m) => ({
    role: m.role,
    content: m.content,
  }))

  const encoder = new TextEncoder()
  const stream = new ReadableStream({
    async start(controller) {
      function emit(event: Record<string, unknown>) {
        controller.enqueue(encoder.encode(`data: ${JSON.stringify(event)}\n\n`))
      }

      try {
        const client = getClaude()

        // Build a fresh "current state" preamble each request: inbox snapshot
        // + last 7 days of decisions. NOT cached (changes per request).
        const [inboxItems, decisions] = await Promise.all([
          runInbox().catch(() => []),
          recentDecisions({ days: 7, limit: 30 }).catch(() => []),
        ])
        const stateBlock = buildStateBlock(inboxItems, decisions)

        // Tool-use loop: keep cycling until Claude returns end_turn (no more
        // tool calls). Each cycle either (a) streams text to the client or
        // (b) executes a tool and feeds the result back.
        let safetyTurns = 0
        const maxTurns = 6

        while (safetyTurns++ < maxTurns) {
          const response = await client.messages.create({
            model: ASSISTANT_MODEL,
            max_tokens: ASSISTANT_MAX_TOKENS,
            temperature: ASSISTANT_TEMPERATURE,
            system: [
              {
                type: "text",
                text: SYSTEM_PROMPT,
                cache_control: { type: "ephemeral" },
              },
              {
                type: "text",
                text: stateBlock,
              },
            ],
            tools: tools.map((t, i) =>
              i === tools.length - 1
                ? { ...t, cache_control: { type: "ephemeral" } }
                : t,
            ) as Anthropic.Tool[],
            messages,
            stream: false,
          })

          // Stream text blocks to the client; collect tool_use blocks
          const toolUses: Array<{ id: string; name: string; input: Record<string, unknown> }> = []
          for (const block of response.content) {
            if (block.type === "text") {
              if (block.text) emit({ type: "text", text: block.text })
            } else if (block.type === "tool_use") {
              toolUses.push({
                id: block.id,
                name: block.name,
                input: block.input as Record<string, unknown>,
              })
              emit({ type: "tool_use", name: block.name, input: block.input })
            }
          }

          if (response.stop_reason !== "tool_use" || toolUses.length === 0) {
            break
          }

          // Execute tools in parallel, then feed results back as a user message
          const results = await Promise.all(
            toolUses.map(async (tu) => {
              const result = await runTool(tu.name, tu.input)
              emit({
                type: "tool_result",
                name: tu.name,
                ok: result.ok,
                summary: summariseToolResult(result),
              })
              return {
                type: "tool_result" as const,
                tool_use_id: tu.id,
                content: JSON.stringify(result),
              }
            }),
          )

          // Append assistant turn (with tool_use) and user turn (tool results)
          messages.push({
            role: "assistant",
            content: response.content,
          })
          messages.push({
            role: "user",
            content: results,
          })
        }

        emit({ type: "done" })
      } catch (err) {
        emit({
          type: "error",
          error: err instanceof Error ? err.message : String(err),
        })
      } finally {
        controller.close()
      }
    },
  })

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-store, no-transform",
      Connection: "keep-alive",
    },
  })
}

function summariseToolResult(result: { ok: boolean; data?: unknown; error?: string }): string {
  if (!result.ok) return `error: ${result.error}`
  const data = result.data
  if (Array.isArray(data)) return `${data.length} record(s)`
  if (data && typeof data === "object" && "count" in data) {
    return `${(data as { count: number }).count} record(s)`
  }
  if (data && typeof data === "object" && "approved" in data) return "approved"
  if (data && typeof data === "object" && "allocated" in data) return "allocated"
  if (data && typeof data === "object" && "logged" in data) return "logged"
  return "ok"
}

type Decision = Awaited<ReturnType<typeof recentDecisions>>[number]
type InboxItemBrief = Awaited<ReturnType<typeof runInbox>>[number]

function buildStateBlock(inbox: InboxItemBrief[], decisions: Decision[]): string {
  const inboxLines = inbox.length === 0
    ? "(empty)"
    : inbox
        .slice(0, 12)
        .map(
          (i) =>
            `- [${i.urgency}] ${i.source} :: ${i.title}${i.context ? " (" + i.context + ")" : ""} :: id=${i.id}`,
        )
        .join("\n")

  const decisionLines = decisions.length === 0
    ? "(none recorded - decision log may not be configured yet)"
    : decisions
        .slice(0, 20)
        .map((d) => {
          const when = d.occurredAt.slice(0, 10)
          const subj = d.subject ? ` :: ${d.subject}` : ""
          const summary = typeof d.body === "object" && d.body && "text" in d.body
            ? String((d.body as { text: string }).text).slice(0, 100)
            : JSON.stringify(d.body).slice(0, 100)
          return `- ${when} [${d.actor}] ${d.category}${subj} :: ${summary}`
        })
        .join("\n")

  return `Current state at request time:

INBOX (top 12, prioritised now > today > this-week):
${inboxLines}

RECENT DECISIONS (last 7 days, top 20):
${decisionLines}

Use this context to answer "what's on" / "what did I do" questions directly without calling tools, when the answer is already here. Call tools only when more detail or a new action is required.`
}
