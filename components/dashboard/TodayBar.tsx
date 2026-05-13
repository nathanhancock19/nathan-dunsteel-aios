"use client"

import { useEffect, useState } from "react"
import { SyncAllButton } from "./SyncAllButton"

/**
 * Top-of-dashboard greeting + Sydney date.
 *
 * Client component because:
 *  1. Sydney calendar date must be wall-clock-current, not server-boot-current.
 *  2. Long-open tabs need to roll over at midnight without a refresh.
 *
 * Ticks once a minute. Cheap, no network.
 */
export function TodayBar({ name }: { name: string }) {
  const [now, setNow] = useState<Date | null>(null)

  useEffect(() => {
    setNow(new Date())
    const id = setInterval(() => setNow(new Date()), 60_000)
    return () => clearInterval(id)
  }, [])

  // First render is SSR — render a neutral placeholder so server and client
  // strings match. Real date hydrates immediately after mount.
  const greeting = now ? pickGreeting(sydneyHour(now)) : "Hello"
  const weekday = now ? sydneyFormat(now, { weekday: "long" }) : ""
  const longDate = now ? sydneyFormat(now, { day: "numeric", month: "long", year: "numeric" }) : ""
  const isoDate = now ? sydneyIso(now) : ""

  return (
    <div className="mb-6 flex flex-wrap items-baseline justify-between gap-2 border-b border-rule pb-4">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight text-cream">
          {greeting}, {name.split(" ")[0]}.
        </h1>
        <p className="text-sm text-muted">
          {weekday}
          {weekday && longDate ? ", " : ""}
          {longDate}
        </p>
      </div>
      <div className="flex items-center gap-3">
        <p className="label">{isoDate}</p>
        <SyncAllButton />
      </div>
    </div>
  )
}

function sydneyFormat(d: Date, opts: Intl.DateTimeFormatOptions): string {
  return d.toLocaleDateString("en-AU", { timeZone: "Australia/Sydney", ...opts })
}

function sydneyIso(d: Date): string {
  return d.toLocaleDateString("en-CA", { timeZone: "Australia/Sydney" })
}

function sydneyHour(d: Date): number {
  const h = d.toLocaleString("en-GB", {
    timeZone: "Australia/Sydney",
    hour: "2-digit",
    hour12: false,
  })
  return Number(h)
}

function pickGreeting(hour: number): string {
  if (hour < 12) return "Morning"
  if (hour < 18) return "Afternoon"
  return "Evening"
}
