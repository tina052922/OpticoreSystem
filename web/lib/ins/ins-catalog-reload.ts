/**
 * Browser event fired after schedule rows are saved to `ScheduleEntry` (e.g. GEC Chairman “Save Vacant Edits”).
 * `useInsCatalog` listens and calls `load()` immediately so Faculty / Section / Room INS forms stay in sync
 * even if Realtime is disabled.
 */
export const INS_CATALOG_RELOAD_EVENT = "opticore:ins-catalog-reload";

export function dispatchInsCatalogReload(): void {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new Event(INS_CATALOG_RELOAD_EVENT));
}
