"use client";

/**
 * Polling-based schedule entry sync per `academicPeriodId`.
 * Replaces the old Supabase Realtime channel with 30-second polling via apiFetch.
 */
import type { ScheduleEntry } from "@/types/db";

type PoolEntry = {
  intervalId: ReturnType<typeof setInterval>;
  listeners: Set<() => void>;
  remove: () => void;
};

const pool = new Map<string, PoolEntry>();

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

async function pollPeriodEntries(periodId: string) {
  try {
    const { apiFetch } = await import("@/lib/api/client");
    const data = await apiFetch<{ entries: ScheduleEntry[] }>(
      `/api/catalog/schedule-entries?academicPeriodId=${periodId}`,
      { method: "GET" },
    );
    if (data) notifyListeners(periodId);
  } catch {
    /* poll error — ignore, retry on next interval */
  }
}

/**
 * Register a polling reload listener for the term. Returns unsubscribe.
 * Polls every 30 seconds.
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
      void pollPeriodEntries(periodId);
    }, 30_000);

    const remove = () => {
      clearInterval(intervalId);
    };
    entry = { intervalId, listeners, remove };
    pool.set(periodId, entry);
  }

  entry.listeners.add(onChange);
  return () => {
    const current = pool.get(periodId);
    if (!current) return;
    current.listeners.delete(onChange);
    if (current.listeners.size === 0) {
      current.remove();
      pool.delete(periodId);
    }
  };
}
