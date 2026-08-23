"use client";

/**
 * Polling-based schedule entry sync per `academicPeriodId`.
 * Replaces the old Supabase Realtime channel with 30-second polling via apiFetch.
 *
 * This is the **single** owner of the `schedule-entries` poll cadence. Every
 * consumer (INS forms, Evaluator hubs, Central Hub) subscribes here rather than
 * running its own `setInterval`, so N mounted components produce one timer and
 * one network request per tick — not N.
 *
 * Ticks are skipped while the tab is hidden and replayed once on refocus, so a
 * backgrounded tab stops consuming the backend's rate-limit budget.
 */
import type { ScheduleEntry } from "@/types/db";
import { catalogApi } from "@/lib/api/client";
import { subscribeRealtime } from "@/lib/realtime/realtime-client";

/**
 * Fallback cadence only. Server-pushed `schedule.changed` events are the
 * primary path, so this exists to cover a dropped SSE connection or a write
 * made outside the API. Kept long on purpose — a short interval here would
 * negate the load reduction realtime provides.
 */
const POLL_INTERVAL_MS = 180_000;

type PoolEntry = {
  intervalId: ReturnType<typeof setInterval>;
  listeners: Set<() => void>;
  /** Set when a tick is skipped because the tab was hidden; drives refocus catch-up. */
  missedTick: boolean;
  remove: () => void;
};

const pool = new Map<string, PoolEntry>();

function isHidden(): boolean {
  return typeof document !== "undefined" && document.visibilityState === "hidden";
}

function notifyListeners(periodId: string) {
  const entry = pool.get(periodId);
  if (!entry) return;
  for (const fn of entry.listeners) {
    try {
      fn();
    } catch {
      /* listener owns error handling */
    }
  }
}

/**
 * One document-level visibility listener for the whole pool. Registered lazily
 * on first subscription and torn down when the pool empties, so we never leak a
 * listener on an app that has no schedule views mounted.
 */
let visibilityBound = false;

function onVisibilityChange() {
  if (isHidden()) return;
  for (const [periodId, entry] of pool) {
    if (!entry.missedTick) continue;
    entry.missedTick = false;
    void pollPeriodEntries(periodId);
  }
}

function bindVisibility() {
  if (visibilityBound || typeof document === "undefined") return;
  document.addEventListener("visibilitychange", onVisibilityChange);
  visibilityBound = true;
}

function unbindVisibilityIfIdle() {
  if (!visibilityBound || pool.size > 0 || typeof document === "undefined") return;
  document.removeEventListener("visibilitychange", onVisibilityChange);
  visibilityBound = false;
}

/**
 * One SSE subscription for the whole pool, bound lazily alongside the first
 * term and released when the pool empties.
 *
 * An event for term X refreshes only term X. An event with no
 * `academicPeriodId` (shouldn't happen, but don't lose data if it does)
 * refreshes every subscribed term.
 */
let realtimeUnsubscribe: (() => void) | null = null;

function bindRealtime() {
  if (realtimeUnsubscribe) return;
  realtimeUnsubscribe = subscribeRealtime((event) => {
    if (event.name !== "schedule.changed" && event.name !== "schedule.published") {
      return;
    }
    const periodId = event.payload?.academicPeriodId?.trim();
    if (periodId) {
      if (pool.has(periodId)) void pollPeriodEntries(periodId);
      return;
    }
    for (const id of pool.keys()) void pollPeriodEntries(id);
  });
}

function unbindRealtimeIfIdle() {
  if (!realtimeUnsubscribe || pool.size > 0) return;
  realtimeUnsubscribe();
  realtimeUnsubscribe = null;
}

/**
 * Refresh the term's entries once, then wake listeners.
 *
 * `forceRefresh` bypasses the TTL but still writes the fresh payload into the
 * cache. Listeners that immediately re-read the same URL therefore hit that
 * warm entry instead of issuing N duplicate network requests — previously each
 * poll tick produced 1 + (number of mounted consumers) identical calls.
 */
async function pollPeriodEntries(periodId: string) {
  try {
    const data = await catalogApi.scheduleEntries<{ entries: ScheduleEntry[] }>(
      periodId,
      { forceRefresh: true },
    );
    if (data) notifyListeners(periodId);
  } catch {
    /* poll error — ignore, retry on next tick or event */
  }
}

/**
 * Register a polling reload listener for the term. Returns unsubscribe.
 *
 * Polls every 30 seconds, shared across all subscribers for the same term.
 * Subscribing does NOT fetch immediately — callers own their initial load, and
 * firing here would double-fetch on mount.
 */
export function subscribeScheduleEntryRealtimePool(
  academicPeriodId: string,
  onChange: () => void,
): () => void {
  const periodId = academicPeriodId.trim();
  if (!periodId) return () => {};

  let entry = pool.get(periodId);
  if (!entry) {
    const listeners = new Set<() => void>();

    const intervalId = setInterval(() => {
      const current = pool.get(periodId);
      if (!current) return;
      // Skip work in a hidden tab, but remember so we can catch up on refocus.
      if (isHidden()) {
        current.missedTick = true;
        return;
      }
      void pollPeriodEntries(periodId);
    }, POLL_INTERVAL_MS);

    const remove = () => {
      clearInterval(intervalId);
    };
    entry = { intervalId, listeners, missedTick: false, remove };
    pool.set(periodId, entry);
    bindVisibility();
    bindRealtime();
  }

  entry.listeners.add(onChange);
  return () => {
    const current = pool.get(periodId);
    if (!current) return;
    current.listeners.delete(onChange);
    if (current.listeners.size === 0) {
      current.remove();
      pool.delete(periodId);
      unbindVisibilityIfIdle();
      unbindRealtimeIfIdle();
    }
  };
}
