"use client";

/**
 * One Supabase Realtime channel per `academicPeriodId` for ScheduleEntry sync.
 * Multiple hooks/components share the channel; Supabase forbids `.on()` after `.subscribe()`.
 */
import { createSupabaseBrowserClient } from "@/lib/supabase/browser";
import type { RealtimeChannel } from "@supabase/supabase-js";

type PoolEntry = {
  channel: RealtimeChannel;
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

/**
 * Register a debounced reload listener for the term. Returns unsubscribe.
 */
export function subscribeScheduleEntryRealtimePool(
  academicPeriodId: string,
  onChange: () => void,
): () => void {
  const periodId = academicPeriodId.trim();
  if (!periodId) return () => {};

  let entry = pool.get(periodId);
  if (!entry) {
    const supabase = createSupabaseBrowserClient();
    if (!supabase) return () => {};

    const listeners = new Set<() => void>();
    const channel = supabase
      .channel(`opticore-schedule-entry-sync-${periodId}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "ScheduleEntry",
          filter: `academicPeriodId=eq.${periodId}`,
        },
        () => notifyListeners(periodId),
      )
      .subscribe();

    const remove = () => {
      void supabase.removeChannel(channel);
    };
    entry = { channel, listeners, remove };
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
