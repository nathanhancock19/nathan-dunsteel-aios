/**
 * Sydney-time "today" helpers.
 *
 * Everywhere in AIOS that needs "what day is it" should call sydneyToday()
 * rather than reaching for `new Date()` directly. The raw Date constructor
 * gives you UTC, which drifts ~10 hours from Sydney — fine for a timestamp,
 * wrong for "is today Tuesday".
 *
 * Note: these functions are intentionally called on every request, not
 * memoised. SSR results were going stale because module-level const
 * evaluated to "today at server start" instead of "today now".
 */

const SYDNEY_TZ = "Australia/Sydney"

function toSydneyParts(d: Date): { year: number; month: number; day: number } {
  // en-CA gives YYYY-MM-DD; safer than parsing a long-form locale string.
  const iso = d.toLocaleDateString("en-CA", { timeZone: SYDNEY_TZ })
  const [y, m, day] = iso.split("-").map(Number)
  return { year: y, month: m, day }
}

function sydneyDateAt(year: number, month: number, day: number): Date {
  // Construct a Date that represents 12:00 noon on the given Sydney calendar
  // date. Noon avoids DST transition edges; we only ever read the date back
  // out via toLocaleDateString, so the exact wall-clock instant doesn't
  // matter beyond "stays on the same Sydney day".
  return new Date(`${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}T02:00:00.000Z`)
}

export type SydneyToday = {
  /** YYYY-MM-DD string for today in Sydney. */
  isoDate: string
  /** A Date positioned on today's Sydney calendar day (noon Sydney). */
  date: Date
  /** YYYY-MM-DD string for yesterday in Sydney. */
  yesterdayIso: string
  /** YYYY-MM-DD string for tomorrow in Sydney. */
  tomorrowIso: string
  /**
   * Seven dates representing Mon-Sun of the current Sydney week. Always
   * starts on Monday so "this week" is stable regardless of when in the
   * week the call is made.
   */
  weekDays: Date[]
  /** ISO date strings paired with weekDays. */
  weekDaysIso: string[]
  /** Day-of-week index for today (0 = Monday, 6 = Sunday). */
  weekdayIndex: number
}

export function sydneyToday(): SydneyToday {
  const now = new Date()
  const today = toSydneyParts(now)
  const todayDate = sydneyDateAt(today.year, today.month, today.day)

  // JS getDay() on a noon-UTC date keyed off a Sydney YMD is reliable for
  // weekday calculation because the YMD itself comes from Sydney.
  // Sunday = 0 in JS; we want Monday = 0.
  const jsDow = todayDate.getUTCDay()
  const weekdayIndex = (jsDow + 6) % 7 // Mon=0, Tue=1, ..., Sun=6

  const weekDays: Date[] = []
  const weekDaysIso: string[] = []
  for (let i = 0; i < 7; i++) {
    const offset = i - weekdayIndex // Mon = today - weekdayIndex
    const d = sydneyDateAt(today.year, today.month, today.day + offset)
    weekDays.push(d)
    weekDaysIso.push(d.toLocaleDateString("en-CA", { timeZone: SYDNEY_TZ }))
  }

  const yesterday = sydneyDateAt(today.year, today.month, today.day - 1)
  const tomorrow = sydneyDateAt(today.year, today.month, today.day + 1)

  return {
    isoDate: todayDate.toLocaleDateString("en-CA", { timeZone: SYDNEY_TZ }),
    date: todayDate,
    yesterdayIso: yesterday.toLocaleDateString("en-CA", { timeZone: SYDNEY_TZ }),
    tomorrowIso: tomorrow.toLocaleDateString("en-CA", { timeZone: SYDNEY_TZ }),
    weekDays,
    weekDaysIso,
    weekdayIndex,
  }
}

/** Bare ISO date string for today in Sydney. Common case, no allocation. */
export function sydneyTodayIso(): string {
  return new Date().toLocaleDateString("en-CA", { timeZone: SYDNEY_TZ })
}

/** ISO date string for the given offset (days) from today in Sydney. */
export function sydneyDateOffsetIso(offsetDays: number): string {
  const t = sydneyToday()
  const [y, m, d] = t.isoDate.split("-").map(Number)
  return sydneyDateAt(y, m, d + offsetDays).toLocaleDateString("en-CA", {
    timeZone: SYDNEY_TZ,
  })
}
