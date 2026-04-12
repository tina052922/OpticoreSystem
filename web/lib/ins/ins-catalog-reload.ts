/**
 * Browser event fired after Chairman saves plotted rows to `ScheduleEntry`, so INS hooks can
 * refetch immediately even if Supabase Realtime is not enabled for the project.
 */
export const INS_CATALOG_RELOAD_EVENT = "opticore:ins-catalog-reload";

export function dispatchInsCatalogReload(): void {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new Event(INS_CATALOG_RELOAD_EVENT));
}
