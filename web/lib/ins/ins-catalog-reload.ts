/**
 * Browser event fired after schedule rows are saved to `ScheduleEntry` (Program Chairman, GEC Chairman,
 * College Admin hub, conflict “Apply”, hub quick-edits). Listeners:
 * - `useInsCatalog` — INS Faculty / Section / Room (instructor, chairman, college admin, GEC, DOI scopes)
 * - `useScheduleEntryCrossReload` — Central Hub, GEC hub, Program Chairman worksheet, timetabling panel
 *
 * Call this after every successful `ScheduleEntry` write so open tabs refetch without waiting only on Realtime.
 *
 * **Cross-tab:** The window event only reaches the current tab. We also `BroadcastChannel` so other open
 * tabs (e.g. GEC Evaluator + College Admin INS) refetch immediately without relying on Supabase Realtime
 * (`ScheduleEntry` must be added to `supabase_realtime` publication for DB-triggered sync across machines).
 */
export const INS_CATALOG_RELOAD_EVENT = "opticore:ins-catalog-reload";

const SCHEDULE_BROADCAST = "opticore-schedule-entry-sync";

export function dispatchInsCatalogReload(): void {
  if (typeof window === "undefined") return;
  let usedBc = false;
  try {
    if (typeof BroadcastChannel !== "undefined") {
      const bc = new BroadcastChannel(SCHEDULE_BROADCAST);
      bc.postMessage({ t: Date.now() });
      bc.close();
      usedBc = true;
    }
  } catch {
    /* ignore */
  }
  /** Fallback when BroadcastChannel is unavailable (older browsers / SSR handoff). */
  if (!usedBc) {
    window.dispatchEvent(new Event(INS_CATALOG_RELOAD_EVENT));
  }
}

/** Subscribe to cross-tab schedule reload pings (same browser profile). Returns unsubscribe. */
export function subscribeScheduleEntryBroadcast(onReload: () => void): () => void {
  if (typeof window === "undefined" || typeof BroadcastChannel === "undefined") {
    return () => {};
  }
  const bc = new BroadcastChannel(SCHEDULE_BROADCAST);
  bc.onmessage = () => {
    onReload();
  };
  return () => {
    try {
      bc.close();
    } catch {
      /* ignore */
    }
  };
}
