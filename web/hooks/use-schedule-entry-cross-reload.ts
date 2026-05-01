"use client";

/**
 * Keeps Evaluator hubs (Central Hub, GEC hub) aligned with INS Forms when `ScheduleEntry` changes.
 *
 * - Same-tab: `dispatchInsCatalogReload()` triggers a debounced full reload (~420ms) to reduce stale reads.
 * - Other tabs / clients: Supabase Realtime on `ScheduleEntry` (debounced to avoid storms).
 *
 * INS catalog (`useInsCatalog`) already listens to the same window event + Realtime; this hook mirrors
 * that behavior for components that maintain their own `ScheduleEntry` fetch (`load`).
 */
import { useEffect, useRef, useCallback } from "react";
import { createSupabaseBrowserClient } from "@/lib/supabase/browser";
import {
  INS_CATALOG_RELOAD_EVENT,
  subscribeScheduleEntryBroadcast,
  type InsCatalogReloadDetail,
} from "@/lib/ins/ins-catalog-reload";

export function useScheduleEntryCrossReload(
  load: () => void | Promise<void>,
  options: { enabled?: boolean; academicPeriodId: string | null | undefined },
): void {
  const { enabled = true, academicPeriodId } = options;
  const loadRef = useRef(load);
  loadRef.current = load;
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  /** Same-tab `dispatchInsCatalogReload`: brief delay so PostgREST read-after-write is less likely to return old slots. */
  const catalogDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const scheduleDebouncedReload = useCallback(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      debounceRef.current = null;
      void loadRef.current();
    }, 130);
  }, []);

  const scheduleCatalogReload = useCallback(() => {
    if (catalogDebounceRef.current) clearTimeout(catalogDebounceRef.current);
    catalogDebounceRef.current = setTimeout(() => {
      catalogDebounceRef.current = null;
      void loadRef.current();
    }, 420);
  }, []);

  useEffect(() => {
    if (!enabled) return;
    const onCatalogEvent = (_detail?: InsCatalogReloadDetail) => scheduleCatalogReload();
    if (typeof BroadcastChannel !== "undefined") {
      const unsub = subscribeScheduleEntryBroadcast(onCatalogEvent);
      return () => {
        if (catalogDebounceRef.current) {
          clearTimeout(catalogDebounceRef.current);
          catalogDebounceRef.current = null;
        }
        unsub();
      };
    }
    const onWindowReload = (_ev: Event) => onCatalogEvent();
    window.addEventListener(INS_CATALOG_RELOAD_EVENT, onWindowReload);
    return () => {
      if (catalogDebounceRef.current) {
        clearTimeout(catalogDebounceRef.current);
        catalogDebounceRef.current = null;
      }
      window.removeEventListener(INS_CATALOG_RELOAD_EVENT, onWindowReload);
    };
  }, [enabled, scheduleCatalogReload]);

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

  /**
   * Cross-user reflection fallback:
   * When Supabase Realtime isn't delivering `ScheduleEntry` events (common when the publication is missing),
   * periodically refetch the term rows. This keeps Central Hub / GEC hub aligned with INS without lag.
   */
  useEffect(() => {
    if (!enabled || !academicPeriodId) return;
    let stopped = false;
    const tick = () => {
      if (stopped) return;
      if (typeof document !== "undefined" && document.visibilityState !== "visible") return;
      void loadRef.current();
    };
    /** 8s + jitter: keeps hubs aligned if Realtime publication is missing, without hammering PostgREST. */
    const jitterMs = 350 + Math.round(Math.random() * 800);
    const id = window.setInterval(tick, 8_000 + jitterMs);
    return () => {
      stopped = true;
      window.clearInterval(id);
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
        {
          event: "*",
          schema: "public",
          table: "ScheduleEntry",
          filter: `academicPeriodId=eq.${academicPeriodId}`,
        },
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
