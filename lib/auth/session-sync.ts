/**
 * Keeps every open OptiCore tab on the SAME account.
 *
 * All tabs of a browser share one sign-in (the HTTP-only session cookie). Signing in as someone else
 * in a second tab silently replaced it — while the first tab kept SHOWING the old account (e.g.
 * College Admin) and, from then on, acting as the new one (Chairperson). Signing out in one tab left the
 * others looking signed in.
 *
 * Every sign-in and sign-out is announced here (BroadcastChannel, with a localStorage fallback for
 * browsers without it). `SessionGuard` listens in each tab and, if the tab is now showing someone
 * who is no longer signed in, sends it to the login page or reloads it as the account that is.
 *
 * Nothing sensitive is sent: only the event kind and the user id.
 */

export type SessionEvent = {
  type: "login" | "logout";
  userId: string | null;
  at: number;
  /** The tab that announced it — a tab ignores its own announcements. */
  origin?: string;
};

/** This tab's id, so it does not react to what it announced itself. */
const TAB_ID = `tab-${Math.random().toString(36).slice(2)}-${Date.now().toString(36)}`;

const CHANNEL = "opticore-session";
const STORAGE_KEY = "opticore.session.event";

export function isSessionEvent(v: unknown): v is SessionEvent {
  if (!v || typeof v !== "object") return false;
  const e = v as Record<string, unknown>;
  return (e.type === "login" || e.type === "logout") && typeof e.at === "number";
}

/** Tell the other tabs that this browser's sign-in changed. */
export function announceSession(type: SessionEvent["type"], userId: string | null): void {
  if (typeof window === "undefined") return;
  const event: SessionEvent = { type, userId, at: Date.now(), origin: TAB_ID };
  try {
    if (typeof BroadcastChannel !== "undefined") {
      const bc = new BroadcastChannel(CHANNEL);
      bc.postMessage(event);
      bc.close();
    }
  } catch {
    /* fall through to storage */
  }
  try {
    // A changing value fires `storage` in every OTHER tab.
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(event));
  } catch {
    /* private mode / blocked storage: the focus re-check still covers it */
  }
}

/** Listen for sign-in changes made in other tabs. Returns an unsubscribe function. */
export function subscribeSession(handler: (event: SessionEvent) => void): () => void {
  if (typeof window === "undefined") return () => {};
  const fromOtherTab = (e: SessionEvent) => {
    if (e.origin !== TAB_ID) handler(e);
  };
  let bc: BroadcastChannel | null = null;
  try {
    if (typeof BroadcastChannel !== "undefined") {
      bc = new BroadcastChannel(CHANNEL);
      bc.onmessage = (m) => {
        if (isSessionEvent(m.data)) fromOtherTab(m.data);
      };
    }
  } catch {
    bc = null;
  }
  const onStorage = (e: StorageEvent) => {
    if (e.key !== STORAGE_KEY || !e.newValue) return;
    try {
      const parsed = JSON.parse(e.newValue);
      if (isSessionEvent(parsed)) fromOtherTab(parsed);
    } catch {
      /* ignore malformed */
    }
  };
  window.addEventListener("storage", onStorage);
  return () => {
    window.removeEventListener("storage", onStorage);
    try {
      bc?.close();
    } catch {
      /* ignore */
    }
  };
}

/**
 * What a tab showing `shownUserId` should do about a session event:
 *   • "logout"   — the browser was signed out: go to the login page;
 *   • "switch"   — someone else signed in: reload as them;
 *   • "none"     — same account (e.g. signed in again in another tab): nothing.
 */
export function reactionToSessionEvent(
  shownUserId: string | null,
  event: SessionEvent,
): "logout" | "switch" | "none" {
  if (event.type === "logout") return "logout";
  if (!shownUserId) return "none";
  return event.userId && event.userId !== shownUserId ? "switch" : "none";
}

/** Same decision from a fresh /me check: null = no session any more. */
export function reactionToCurrentUser(
  shownUserId: string | null,
  currentUserId: string | null,
): "logout" | "switch" | "none" {
  if (!shownUserId) return "none";
  if (!currentUserId) return "logout";
  return currentUserId !== shownUserId ? "switch" : "none";
}
