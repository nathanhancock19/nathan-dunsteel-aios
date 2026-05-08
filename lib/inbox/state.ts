/**
 * Per-device inbox state, persisted in localStorage. Snooze, done, and
 * waiting overrides are applied client-side over raw generator output.
 *
 * Key: `aios.inbox.state.v1` -> Record<itemId, InboxItemState>
 *
 * Done items >7 days old are pruned on read so the store stays small.
 */

"use client"

import type { InboxItemState } from "./types"

const STORAGE_KEY = "aios.inbox.state.v1"
const PRUNE_DONE_AFTER_DAYS = 7

type StateMap = Record<string, InboxItemState>

function isBrowser(): boolean {
  return typeof window !== "undefined" && typeof localStorage !== "undefined"
}

function readAll(): StateMap {
  if (!isBrowser()) return {}
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return {}
    const parsed = JSON.parse(raw) as StateMap
    return prune(parsed)
  } catch {
    return {}
  }
}

function prune(map: StateMap): StateMap {
  const cutoff = Date.now() - PRUNE_DONE_AFTER_DAYS * 86400_000
  const out: StateMap = {}
  for (const [id, state] of Object.entries(map)) {
    if (state.kind === "done") {
      if (new Date(state.at).getTime() > cutoff) out[id] = state
    } else if (state.kind === "snoozed") {
      if (new Date(state.until).getTime() > Date.now()) out[id] = state
    } else {
      out[id] = state
    }
  }
  return out
}

function writeAll(map: StateMap): void {
  if (!isBrowser()) return
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(map))
  } catch {}
}

export function getState(id: string): InboxItemState {
  const map = readAll()
  return map[id] ?? { kind: "new" }
}

export function getAllStates(): StateMap {
  return readAll()
}

export function setState(id: string, state: InboxItemState): void {
  const map = readAll()
  if (state.kind === "new") {
    delete map[id]
  } else {
    map[id] = state
  }
  writeAll(map)
}

/** Hide an item for `hours` (default 24). */
export function snooze(id: string, hours = 24): void {
  const until = new Date(Date.now() + hours * 3600_000).toISOString()
  setState(id, { kind: "snoozed", until })
}

export function markDone(id: string): void {
  setState(id, { kind: "done", at: new Date().toISOString() })
}

export function markWaiting(id: string, waitingFor: string, chaseAfterDays = 3): void {
  const chaseAfter = new Date(Date.now() + chaseAfterDays * 86400_000).toISOString()
  setState(id, { kind: "waiting", for: waitingFor, chaseAfter })
}

export function reset(id: string): void {
  setState(id, { kind: "new" })
}

/** Should this item be visible right now given its state? */
export function isVisible(state: InboxItemState): boolean {
  if (state.kind === "new") return true
  if (state.kind === "done") return false
  if (state.kind === "snoozed") {
    return new Date(state.until).getTime() <= Date.now()
  }
  if (state.kind === "waiting") {
    // Waiting items reappear after the chase date as a "still waiting?" nudge.
    return new Date(state.chaseAfter).getTime() <= Date.now()
  }
  return true
}
