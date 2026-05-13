"use client"

import Link from "next/link"
import { useState } from "react"
import { ChevronLeft, ChevronRight, Truck } from "lucide-react"

export type DeliverySlide = {
  date: string // YYYY-MM-DD
  dayName: string // e.g. Friday
  monthLabel: string // e.g. May
  project: string
  details: string
  truck?: string | null
  time?: string | null
  pm?: string | null
  status?: string | null
  signedDocket?: string | null
}

/**
 * One delivery per slide. Left/right arrows flick through, dot indicator
 * shows position. The currently-active slide includes the date header,
 * the project + details, and any metadata available (truck, time, PM,
 * status). Click "Open" to drill into /deliveries?date=...
 *
 * Server passes already-sorted slides chronologically. The carousel does
 * not re-sort.
 */
export function DeliveriesCarousel({
  slides,
  todayIso,
}: {
  slides: DeliverySlide[]
  todayIso: string
}) {
  const [index, setIndex] = useState(0)
  if (slides.length === 0) return null
  const safeIndex = Math.min(Math.max(0, index), slides.length - 1)
  const slide = slides[safeIndex]!
  const isToday = slide.date === todayIso

  function go(delta: number) {
    setIndex((i) => {
      const next = i + delta
      if (next < 0) return slides.length - 1
      if (next >= slides.length) return 0
      return next
    })
  }

  return (
    <div className="flex items-stretch gap-1">
      <button
        type="button"
        onClick={() => go(-1)}
        disabled={slides.length < 2}
        className="flex w-7 items-center justify-center rounded-md border border-rule text-muted hover:bg-surface-2 hover:text-cream disabled:opacity-30"
        aria-label="Previous delivery"
      >
        <ChevronLeft className="h-4 w-4" />
      </button>

      <div className="flex-1 rounded-md border border-rule bg-surface-2 p-3">
        <div className="mb-1.5 flex items-center justify-between gap-2">
          <p className="text-[10px] font-semibold uppercase tracking-wider text-fg-subtle">
            {slide.dayName} {slide.date.slice(8)} {slide.monthLabel}
            {isToday ? <span className="ml-2 text-cream">· today</span> : null}
          </p>
          <span className="mono-nums text-[10px] text-fg-subtle">
            {safeIndex + 1} / {slides.length}
          </span>
        </div>

        <div className="flex items-baseline justify-between gap-2">
          <p className="truncate font-medium text-cream">
            {slide.project || "(no project)"}
          </p>
          {slide.time ? (
            <p className="shrink-0 text-xs text-fg-muted">{slide.time}</p>
          ) : null}
        </div>

        {slide.details ? (
          <p className="mt-1 line-clamp-2 whitespace-pre-line text-xs text-fg-muted">
            {slide.details}
          </p>
        ) : null}

        <div className="mt-2 flex flex-wrap items-center gap-x-2 gap-y-1 text-[11px] text-fg-subtle">
          {slide.truck ? <span>{slide.truck}</span> : null}
          {slide.pm ? <span>PM {slide.pm}</span> : null}
          {slide.status ? <span>{slide.status}</span> : null}
          <Link
            href={`/deliveries?date=${slide.date}`}
            className="ml-auto text-muted hover:text-cream"
          >
            Open →
          </Link>
        </div>
      </div>

      <button
        type="button"
        onClick={() => go(1)}
        disabled={slides.length < 2}
        className="flex w-7 items-center justify-center rounded-md border border-rule text-muted hover:bg-surface-2 hover:text-cream disabled:opacity-30"
        aria-label="Next delivery"
      >
        <ChevronRight className="h-4 w-4" />
      </button>
    </div>
  )
}

/**
 * Optional empty-state matching the surrounding card style. Use when
 * there are no deliveries for the requested window.
 */
export function NoDeliveries({ description }: { description: string }) {
  return (
    <div className="flex flex-col items-center gap-2 py-4 text-center">
      <Truck className="h-5 w-5 text-fg-subtle" />
      <p className="text-xs text-muted">{description}</p>
    </div>
  )
}
