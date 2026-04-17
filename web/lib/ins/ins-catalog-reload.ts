/**
 * Browser event fired after schedule rows are saved to `ScheduleEntry` (Program Chairman, GEC Chairman,
 * College Admin hub, conflict “Apply”, hub quick-edits). Listeners:
 * - `useInsCatalog` — INS Faculty / Section / Room (instructor, chairman, college admin, GEC, DOI scopes)
 * - `useScheduleEntryCrossReload` — Central Hub, GEC hub, Program Chairman worksheet, timetabling panel
 *
 * Call this after every successful `ScheduleEntry` write so open tabs refetch without waiting only on Realtime.
 */
export const INS_CATALOG_RELOAD_EVENT = "opticore:ins-catalog-reload";

export function dispatchInsCatalogReload(): void {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new Event(INS_CATALOG_RELOAD_EVENT));
}
