"use client";

/**
 * Singleton SSE client for server-pushed invalidation signals.
 *
 * Design
 * ──────
 *   • ONE connection per tab, shared by every hook/component. `EventSource`
 *     costs a server socket, so opening one per consumer would multiply
 *     backend connections by the number of mounted views — the exact problem
 *     the polling refactor set out to fix.
 *   • Auth rides on the existing HTTP-only cookies (`withCredentials`). No
 *     token is read from or written to JS, matching `lib/api/client.ts`.
 *   • Events carry only opaque ids. Handlers translate them into cache
 *     invalidation + refetch; they never render event payloads as data.
 *   • The connection is lazy: it opens on first subscribe and closes when the
 *     last subscriber leaves, so unauthenticated pages hold nothing open.
 *
 * Reconnection
 * ────────────
 * `EventSource` retries automatically, but it does NOT back off, so a backend
 * outage turns every client into a tight reconnect loop. We manage retries
 * ourselves with exponential backoff + jitter, and pause entirely while the
 * tab is hidden or the browser reports offline.
 */

import { API_BASE_URL } from "@/lib/api/client";

export type RealtimeEventName =
  | "schedule.changed"
  | "schedule.published"
  | "notification.changed"
  | "badge.changed"
  | "config.changed"
  | "period.changed";

/** Must stay in sync with `BadgeKind` in the backend's `realtime/events.ts`. */
export type RealtimeBadgeKind =
  | "access_requests"
  | "schedule_change_requests"
  | "policy_reviews"
  | "audit_log"
  /** Instructor self-registrations awaiting chairman approval. */
  | "instructor_requests";

export type RealtimeEventPayload = {
  academicPeriodId?: string;
  collegeId?: string;
  badge?: RealtimeBadgeKind;
  at?: string;
};

export type RealtimeEvent = {
  name: RealtimeEventName;
  payload?: RealtimeEventPayload;
};

export type RealtimeStatus = "idle" | "connecting" | "open" | "reconnecting";

type Handler = (event: RealtimeEvent) => void;
type StatusHandler = (status: RealtimeStatus) => void;

const EVENT_NAMES: RealtimeEventName[] = [
  "schedule.changed",
  "schedule.published",
  "notification.changed",
  "badge.changed",
  "config.changed",
  "period.changed",
];

const BASE_RETRY_MS = 1_000;
const MAX_RETRY_MS = 30_000;

const handlers = new Set<Handler>();
const statusHandlers = new Set<StatusHandler>();

let source: EventSource | null = null;
let retryAttempt = 0;
let retryTimer: ReturnType<typeof setTimeout> | null = null;
let status: RealtimeStatus = "idle";
/** Server-assigned id for THIS tab's connection; sent with writes to skip self-echo. */
let connectionId: string | null = null;

/** Read by `apiFetch` so a tab doesn't get pushed an event for its own write. */
export function getRealtimeConnectionId(): string | null {
  return connectionId;
}

export function getRealtimeStatus(): RealtimeStatus {
  return status;
}

function setStatus(next: RealtimeStatus) {
  if (status === next) return;
  status = next;
  for (const fn of [...statusHandlers]) {
    try {
      fn(next);
    } catch {
      /* subscriber owns its errors */
    }
  }
}

function emit(event: RealtimeEvent) {
  for (const fn of [...handlers]) {
    try {
      fn(event);
    } catch (err) {
      // One bad handler must not stop delivery to the others.
      console.error("[realtime] handler threw", err);
    }
  }
}

function clearRetry() {
  if (retryTimer) {
    clearTimeout(retryTimer);
    retryTimer = null;
  }
}

function scheduleReconnect() {
  clearRetry();
  if (handlers.size === 0) return;

  // Exponential backoff with jitter: prevents a synchronized stampede when a
  // restarted backend drops every client at once.
  const delay = Math.min(BASE_RETRY_MS * 2 ** retryAttempt, MAX_RETRY_MS);
  const jittered = delay * (0.5 + Math.random() * 0.5);
  retryAttempt += 1;
  setStatus("reconnecting");

  retryTimer = setTimeout(() => {
    retryTimer = null;
    openConnection();
  }, jittered);
}

function closeConnection() {
  clearRetry();
  if (source) {
    source.close();
    source = null;
  }
  connectionId = null;
  setStatus("idle");
}

function openConnection() {
  if (typeof window === "undefined") return;
  if (source || handlers.size === 0) return;
  // Don't burn retries while offline; the `online` listener re-opens.
  if (typeof navigator !== "undefined" && navigator.onLine === false) {
    setStatus("reconnecting");
    return;
  }

  setStatus(retryAttempt === 0 ? "connecting" : "reconnecting");

  const url = `${API_BASE_URL}/api/realtime/stream`;
  const es = new EventSource(url, { withCredentials: true });
  source = es;

  es.addEventListener("connected", (ev) => {
    retryAttempt = 0;
    try {
      connectionId = JSON.parse((ev as MessageEvent).data)?.connectionId ?? null;
    } catch {
      connectionId = null;
    }
    setStatus("open");
  });

  for (const name of EVENT_NAMES) {
    es.addEventListener(name, (ev) => {
      let payload: RealtimeEventPayload | undefined;
      try {
        payload = JSON.parse((ev as MessageEvent).data)?.payload;
      } catch {
        payload = undefined;
      }
      emit({ name, payload });
    });
  }

  es.onerror = () => {
    // EventSource fires `error` for both transient drops and hard failures and
    // would silently retry without backoff — take over explicitly.
    if (source === es) {
      es.close();
      source = null;
      connectionId = null;
    }
    scheduleReconnect();
  };
}

function ensureLifecycleListeners() {
  if (typeof window === "undefined" || lifecycleBound) return;
  lifecycleBound = true;

  // A dropped connection while hidden should recover the moment we return.
  document.addEventListener("visibilitychange", () => {
    if (document.visibilityState !== "visible") return;
    if (handlers.size === 0) return;
    if (!source) {
      retryAttempt = 0;
      openConnection();
    }
  });

  window.addEventListener("online", () => {
    if (handlers.size === 0 || source) return;
    retryAttempt = 0;
    openConnection();
  });

  window.addEventListener("offline", () => {
    if (!source) return;
    source.close();
    source = null;
    connectionId = null;
    setStatus("reconnecting");
  });
}

let lifecycleBound = false;

/**
 * Subscribe to realtime events. Returns an unsubscribe function.
 * The underlying connection opens on the first subscriber and closes after the
 * last one unsubscribes.
 */
export function subscribeRealtime(handler: Handler): () => void {
  if (typeof window === "undefined") return () => {};

  handlers.add(handler);
  ensureLifecycleListeners();
  if (!source) openConnection();

  return () => {
    handlers.delete(handler);
    if (handlers.size === 0) closeConnection();
  };
}

/** Observe connection status (for an offline/stale indicator). */
export function subscribeRealtimeStatus(handler: StatusHandler): () => void {
  statusHandlers.add(handler);
  handler(status);
  return () => {
    statusHandlers.delete(handler);
  };
}

/** Force-drop the connection. Call on logout so the next user reconnects fresh. */
export function resetRealtime(): void {
  retryAttempt = 0;
  closeConnection();
}
