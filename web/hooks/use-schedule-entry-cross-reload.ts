"use client";

/**
 * Keeps Evaluator hubs (Central Hub, GEC hub) aligned with INS Forms when `ScheduleEntry` changes.
 *
 * - Same-tab: `dispatchInsCatalogReload()` (chairman / GEC saves) triggers an immediate full reload.
 * - Other tabs / clients: Supabase Realtime on `ScheduleEntry` (debounced to avoid storms).
 *
 * INS catalog (`useInsCatalog`) already listens to the same window event + Realtime; this hook mirrors
 * that behavior for components that maintain their own `ScheduleEntry` fetch (`load`).
 */
import { useEffect, useRef, useCallback } from "react";
import { createSupabaseBrowserClient } from "@/lib/supabase/browser";
import { INS_CATALOG_RELOAD_EVENT, subscribeScheduleEntryBroadcast } from "@/lib/ins/ins-catalog-reload";

export function useScheduleEntryCrossReload(
  load: () => void | Promise<void>,
  options: { enabled?: boolean; academicPeriodId: string | null | undefined },
): void {
  const { enabled = true, academicPeriodId } = options;
  const loadRef = useRef(load);
  loadRef.current = load;
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const scheduleDebouncedReload = useCallback(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      debounceRef.current = null;
      void loadRef.current();
    }, 130);
  }, []);

  useEffect(() => {
    if (!enabled) return;
    const onCatalogEvent = () => void loadRef.current();
    if (typeof BroadcastChannel !== "undefined") {
      return subscribeScheduleEntryBroadcast(onCatalogEvent);
    }
    window.addEventListener(INS_CATALOG_RELOAD_EVENT, onCatalogEvent);
    return () => window.removeEventListener(INS_CATALOG_RELOAD_EVENT, onCatalogEvent);
  }, [enabled]);

  /** When returning to a backgrounded tab, refetch (covers missed Realtime/broadcast). Debounced to avoid stacking with other triggers. */
  useEffect(() => {
    if (!enabled || !academicPeriodId) return;
    let t: ReturnType<typeof setTimeout> | null = null;
    const onVis = () => {
      if (document.visibilityState !== "visible") return;
      if (t) clearTimeout(t);
      t = setTimeout(() => {
        t = null;
        void loadRef.current();
      }, 350);
    };
    document.addEventListener("visibilitychange", onVis);
    return () => {
      if (t) clearTimeout(t);
      document.removeEventListener("visibilitychange", onVis);
    };
  }, [enabled, academicPeriodId]);

  useEffect(() => {
    if (!enabled || !academicPeriodId) return;
    const supabase = createSupabaseBrowserClient();
    if (!supabase) return;
    const channel = supabase
      .channel(`opticore-schedule-entry-sync-${academicPeriodId}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "ScheduleEntry" },
        () => scheduleDebouncedReload(),
      )
      .subscribe();

    return () => {
      if (debounceRef.current) {
        clearTimeout(debounceRef.current);
        debounceRef.current = null;
      }
      void supabase.removeChannel(channel);
    };
  }, [enabled, academicPeriodId, scheduleDebouncedReload]);
}
