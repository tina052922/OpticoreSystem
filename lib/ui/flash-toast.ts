/**
 * A success message that survives a full page reload.
 *
 * Some saves reload the page right away (e.g. a student's section change, so the schedule is fetched
 * again). A toast shown before the reload vanishes with it, so the confirmation is parked here and
 * `FlashToastOnLoad` shows it on the next page. One message, read once, this tab only.
 */

const KEY = "opticore.flashToast";

export type FlashToast = { title: string; detail?: string | null };

export function setFlashToast(flash: FlashToast): void {
  try {
    window.sessionStorage.setItem(KEY, JSON.stringify(flash));
  } catch {
    /* storage blocked: the page still saved; it just will not say so after the reload */
  }
}

export function takeFlashToast(): FlashToast | null {
  try {
    const raw = window.sessionStorage.getItem(KEY);
    if (!raw) return null;
    window.sessionStorage.removeItem(KEY);
    const parsed = JSON.parse(raw) as FlashToast;
    return parsed && typeof parsed.title === "string" ? parsed : null;
  } catch {
    return null;
  }
}
