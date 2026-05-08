/**
 * Inbox generator: deliveries scheduled today and tomorrow.
 *
 * Surfaces a single inbox item per delivery for "today" and "tomorrow"
 * (urgency: now / today). Optionally filtered to AIOS_PRIMARY_PROJECT_NUMBER.
 *
 * This is intentionally simple in v1. A future iteration can detect:
 *  - true clashes (>1 truck same hour at same address)
 *  - missing acknowledgement after the scheduled time
 */

import { getDeliveriesForWeek, type DeliveryJob } from "@/lib/sheets/deliveries"
import type { InboxItem, InboxUrgency } from "../types"

function makeItem(
  job: DeliveryJob,
  date: string,
  urgency: InboxUrgency,
): InboxItem {
  const contextParts: string[] = []
  if (job.time) contextParts.push(job.time)
  if (job.truck) contextParts.push(job.truck)
  if (job.contact) contextParts.push(job.contact)
  return {
    id: `sheets-delivery:${date}:${job.jobIndex}:${job.project.slice(0, 30)}`,
    source: "sheets-delivery",
    urgency,
    title: job.project || job.details || `Job ${job.jobIndex}`,
    context: contextParts.length > 0 ? contextParts.join(" · ") : job.details,
    actions: [
      { label: "Open deliveries", href: "/deliveries", variant: "primary" },
    ],
    raw: { date, jobIndex: job.jobIndex, status: job.status },
  }
}

export async function generateDeliveryItems(): Promise<InboxItem[]> {
  let week
  try {
    week = await getDeliveriesForWeek({
      projectFilter: process.env.AIOS_PRIMARY_PROJECT_NUMBER,
    })
  } catch {
    return []
  }

  const out: InboxItem[] = []
  // Today is index 0, tomorrow is index 1 in the rolling week.
  if (week[0]) {
    for (const job of week[0].jobs) out.push(makeItem(job, week[0].date, "now"))
  }
  if (week[1]) {
    for (const job of week[1].jobs) out.push(makeItem(job, week[1].date, "today"))
  }
  return out
}
