/**
 * Subject Scheduler pages (`/chairman/evaluator`, `/admin/college/evaluator`, `/admin/college/evaluator/general`,
 * `/admin/cas/evaluator`, `/admin/gec/evaluator`, `/doi/evaluator`, …) all live under an `/evaluator` segment.
 */
export function isSubjectSchedulerPath(pathname: string | null | undefined): boolean {
  return /\/evaluator(\/|$)/.test(pathname ?? "");
}

/**
 * True while the browser is on a Subject Scheduler page. An autosave can finish after the user has
 * navigated elsewhere; its "Draft saved" toast is only shown when they are still on the scheduler.
 */
export function onSubjectSchedulerPage(): boolean {
  if (typeof window === "undefined") return false;
  return isSubjectSchedulerPath(window.location.pathname);
}
