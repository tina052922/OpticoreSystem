/**
 * Browser event fired after schedule rows are saved to `ScheduleEntry` (Program Chairman, GEC Chairman,
 * College Admin hub, conflict “Apply”, hub quick-edits). Listeners:
 * - `useInsCatalog` — INS Faculty / Section / Room (instructor, chairman, college admin, GEC, DOI scopes)
 * - `useScheduleEntryCrossReload` — Central Hub, GEC hub, Program Chairman worksheet, timetabling panel
 *
 * Call this after every successful `ScheduleEntry` write so open tabs refetch without waiting only on Realtime.
 *
 * **Cross-tab:** The window event only reaches the current tab. We also `BroadcastChannel` so other open
 * tabs (e.g. GEC Evaluator + College Admin INS) refetch immediately without relying on Supabase Realtime.
 * **Cross-user / cross-browser:** `ScheduleEntry` must be in the `supabase_realtime` publication (see
 * migration `20260418140000_scheduleentry_supabase_realtime_publication.sql`) so Chairmen’s saves notify
 * College Admin hubs via `useScheduleEntryCrossReload`.
 *
 * **Same-tab INS:** `window.dispatchEvent(INS_CATALOG_RELOAD_EVENT)` runs immediately so Faculty/Section/Room
 * INS forms refresh without waiting for Realtime (Chairman + GEC saves already call this after upsert).
 */
export const INS_CATALOG_RELOAD_EVENT = "opticore:ins-catalog-reload";

const SCHEDULE_BROADCAST = "opticore-schedule-entry-sync";

export type InsCatalogReloadDetail = {
  t: number;
  /** If provided, listeners should soft-refresh this period immediately (avoids “wrong term” stale grids). */
  academicPeriodId?: string | null;
};

export function dispatchInsCatalogReload(detail?: { academicPeriodId?: string | null }): void {
  if (typeof window === "undefined") return;
  const payload: InsCatalogReloadDetail = { t: Date.now(), academicPeriodId: detail?.academicPeriodId ?? null };
  /** Cross-tab ping (Central Hub, INS in other tabs). */
  try {
    if (typeof BroadcastChannel !== "undefined") {
      const bc = new BroadcastChannel(SCHEDULE_BROADCAST);
      bc.postMessage(payload);
      bc.close();
    }
  } catch {
    /* ignore */
  }
  /**
   * Same-tab listeners (`useInsCatalog`, legacy hooks): always fire the window event as well.
   * BroadcastChannel delivery to the posting document is not guaranteed across browsers; this avoids
   * stale INS Faculty / Section / Room grids after a Chairman save.
   */
  window.dispatchEvent(new CustomEvent<InsCatalogReloadDetail>(INS_CATALOG_RELOAD_EVENT, { detail: payload }));
}

/** Subscribe to cross-tab schedule reload pings (same browser profile). Returns unsubscribe. */
export function subscribeScheduleEntryBroadcast(onReload: (detail?: InsCatalogReloadDetail) => void): () => void {
  if (typeof window === "undefined" || typeof BroadcastChannel === "undefined") {
    return () => {};
  }
  const bc = new BroadcastChannel(SCHEDULE_BROADCAST);
  bc.onmessage = (ev) => {
    onReload((ev?.data as InsCatalogReloadDetail | undefined) ?? undefined);
  };
  return () => {
    try {
      bc.close();
    } catch {
      /* ignore */
    }
  };
}
