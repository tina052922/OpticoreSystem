"use client";

/**
 * Singleton Socket.IO client for server-pushed invalidation signals and live plotting presence.
 *
 * Design
 * ──────
 *   • ONE connection per tab, shared by every hook/component. It opens on the first subscriber and
 *     closes after the last one leaves, so signed-out pages hold nothing open.
 *   • Sign-in: the socket presents a one-minute ticket from `GET /api/realtime/socket-ticket`
 *     (cookie-authenticated through the normal API), fetched again on every (re)connect. No token is
 *     read from or written to JS.
 *   • Path `/api/realtime/io`, so it goes through the same `/api` rewrite as every request
 *     (long-polling there). Set `NEXT_PUBLIC_REALTIME_URL` to the backend's own URL to connect
 *     directly and use WebSockets.
 *   • Events carry only opaque ids. Handlers translate them into cache invalidation + refetch; they
 *     never render event payloads as data. Plotting locks are the one exception: they carry the
 *     holder's name and role label, shown as "Plotting — COTE Admin (Name)".
 *   • Socket.IO reconnects with exponential backoff + jitter on its own; a refused sign-in (expired
 *     session) is retried here on the same backoff.
 */

import { io, type Socket } from "socket.io-client";
import { API_BASE_URL, apiFetch } from "@/lib/api/client";

export type RealtimeEventName =
  | "schedule.changed"
  | "schedule.published"
  | "schedule.unpublished"
  | "notification.changed"
  | "badge.changed"
  | "config.changed"
  | "period.changed"
  /** A teaching-load justification was filed, decided by DOI, or removed. */
  | "justification.changed";

/** Must stay in sync with `BadgeKind` in the backend's `realtime/events.ts`. */
export type RealtimeBadgeKind =
  | "access_requests"
  | "policy_reviews"
  | "audit_log"
  /** Instructor self-registrations awaiting chairperson approval. */
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

/** Someone with the plot window open on a section (see the backend's `realtime/socket.ts`). */
export type PlotLock = {
  academicPeriodId: string;
  sectionId: string;
  socketId: string;
  userId: string;
  name: string;
  roleLabel: string;
  since: string;
  /** What they are doing (missing from an older backend). */
  activity?: PlotActivity;
};

/** "Removing" + "BAELELD-GEC-MMW · Wednesday 7:00 AM – 8:00 AM", and the classes it is about. */
export type PlotActivity = {
  kind: "plotting" | "editing" | "removing";
  detail: string;
  entryIds: string[];
};

/** Someone finished a change on a section: "Class updated by CAS Admin (Name)". */
export type PlotNotice = {
  academicPeriodId: string;
  sectionId: string;
  kind: "plotted" | "edited" | "removed";
  /** "CC-111 · Monday 7:00 AM – 8:00 AM". */
  detail: string;
  /** The classes it is about (missing from an older backend). */
  entryIds?: string[];
  userId: string;
  name: string;
  roleLabel: string;
  at: string;
};

export type PlotLockResult = { ok: true } | { ok: false; holder: PlotLock };

type Handler = (event: RealtimeEvent) => void;
type StatusHandler = (status: RealtimeStatus) => void;
type PresenceHandler = (locks: PlotLock[]) => void;
type NoticeHandler = (notice: PlotNotice) => void;

const EVENT_NAMES = new Set<RealtimeEventName>([
  "schedule.changed",
  "schedule.published",
  "schedule.unpublished",
  "notification.changed",
  "badge.changed",
  "config.changed",
  "period.changed",
  "justification.changed",
]);

const SOCKET_PATH = "/api/realtime/io";
const BASE_RETRY_MS = 1_000;
const MAX_RETRY_MS = 30_000;
/** A lock request that gets no answer (server without sockets, connection down) does not block plotting. */
const LOCK_ACK_MS = 4_000;

const handlers = new Set<Handler>();
const statusHandlers = new Set<StatusHandler>();
const presenceHandlers = new Map<string, Set<PresenceHandler>>();
const presenceByPeriod = new Map<string, PlotLock[]>();
const noticeHandlers = new Map<string, Set<NoticeHandler>>();
/** Locks this tab holds, re-asked for after a reconnect. */
const heldLocks = new Map<string, { academicPeriodId: string; sectionId: string; activity?: PlotActivity }>();

let socket: Socket | null = null;
let status: RealtimeStatus = "idle";
let retryAttempt = 0;
let retryTimer: ReturnType<typeof setTimeout> | null = null;

/** Server-assigned id for THIS tab's connection; sent with writes to skip self-echo. */
export function getRealtimeConnectionId(): string | null {
  return socket?.connected ? (socket.id ?? null) : null;
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

function publishPresence(periodId: string, locks: PlotLock[]) {
  presenceByPeriod.set(periodId, locks);
  for (const fn of [...(presenceHandlers.get(periodId) ?? [])]) {
    try {
      fn(locks);
    } catch (err) {
      console.error("[realtime] presence handler threw", err);
    }
  }
}

function consumerCount(): number {
  let n = handlers.size;
  for (const set of presenceHandlers.values()) n += set.size;
  return n;
}

async function fetchTicket(): Promise<string | null> {
  try {
    const res = await apiFetch<{ ticket?: string }>("/api/realtime/socket-ticket", { method: "GET" });
    return typeof res?.ticket === "string" ? res.ticket : null;
  } catch {
    return null;
  }
}

function lockKey(periodId: string, sectionId: string) {
  return `${periodId}|${sectionId}`;
}

function watchOnServer(periodId: string) {
  socket?.emit("presence.watch", { academicPeriodId: periodId }, (res: { locks?: PlotLock[] } | undefined) => {
    if (Array.isArray(res?.locks)) publishPresence(periodId, res.locks);
  });
}

function clearRetry() {
  if (retryTimer) {
    clearTimeout(retryTimer);
    retryTimer = null;
  }
}

function retryLater() {
  clearRetry();
  if (consumerCount() === 0) return;
  const delay = Math.min(BASE_RETRY_MS * 2 ** retryAttempt, MAX_RETRY_MS);
  retryAttempt += 1;
  setStatus("reconnecting");
  retryTimer = setTimeout(() => {
    retryTimer = null;
    socket?.connect();
  }, delay * (0.5 + Math.random() * 0.5));
}

function ensureConnection() {
  if (typeof window === "undefined") return;
  if (socket) {
    if (!socket.connected && !socket.active) socket.connect();
    return;
  }
  const base = (process.env.NEXT_PUBLIC_REALTIME_URL || API_BASE_URL || "").replace(/\/+$/, "");
  const s = io(base || undefined, {
    path: SOCKET_PATH,
    // Next's /api rewrite redirects a trailing slash away; the server expects none.
    addTrailingSlash: false,
    withCredentials: true,
    autoConnect: false,
    reconnectionDelay: BASE_RETRY_MS,
    reconnectionDelayMax: MAX_RETRY_MS,
    randomizationFactor: 0.5,
    auth: (cb) => {
      void fetchTicket().then((ticket) => cb(ticket ? { ticket } : {}));
    },
  });
  socket = s;
  setStatus("connecting");

  s.on("connect", () => {
    retryAttempt = 0;
    clearRetry();
    setStatus("open");
    for (const periodId of presenceHandlers.keys()) watchOnServer(periodId);
    for (const l of heldLocks.values()) s.emit("plot.lock", l);
  });

  s.on("disconnect", () => {
    if (consumerCount() > 0) setStatus("reconnecting");
  });

  s.on("connect_error", () => {
    // A refused sign-in is not retried by Socket.IO itself; transport errors are.
    if (!s.active) retryLater();
    else setStatus("reconnecting");
  });

  s.on("plot.presence", (data: { academicPeriodId?: string; locks?: PlotLock[] } | undefined) => {
    if (data?.academicPeriodId && Array.isArray(data.locks)) publishPresence(data.academicPeriodId, data.locks);
  });

  s.on("plot.notice", (n: PlotNotice | undefined) => {
    if (!n?.academicPeriodId) return;
    for (const fn of [...(noticeHandlers.get(n.academicPeriodId) ?? [])]) {
      try {
        fn(n);
      } catch (err) {
        console.error("[realtime] notice handler threw", err);
      }
    }
  });

  s.onAny((name: string, data: { payload?: RealtimeEventPayload } | undefined) => {
    if (!EVENT_NAMES.has(name as RealtimeEventName)) return;
    emit({ name: name as RealtimeEventName, payload: data?.payload });
  });

  s.connect();
}

function closeConnection() {
  clearRetry();
  if (socket) {
    socket.removeAllListeners();
    socket.offAny();
    socket.disconnect();
    socket = null;
  }
  setStatus("idle");
}

function closeIfUnused() {
  if (consumerCount() === 0 && heldLocks.size === 0) closeConnection();
}

/**
 * Subscribe to realtime events. Returns an unsubscribe function.
 * The underlying connection opens on the first subscriber and closes after the last one leaves.
 */
export function subscribeRealtime(handler: Handler): () => void {
  if (typeof window === "undefined") return () => {};
  handlers.add(handler);
  ensureConnection();
  return () => {
    handlers.delete(handler);
    closeIfUnused();
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

/** Follow who is plotting in a term. The handler gets the current list now and on every change. */
export function watchPlotPresence(academicPeriodId: string, handler: PresenceHandler): () => void {
  if (typeof window === "undefined" || !academicPeriodId) return () => {};
  let set = presenceHandlers.get(academicPeriodId);
  const first = !set;
  if (!set) {
    set = new Set();
    presenceHandlers.set(academicPeriodId, set);
  }
  set.add(handler);
  handler(presenceByPeriod.get(academicPeriodId) ?? []);
  ensureConnection();
  if (first && socket?.connected) watchOnServer(academicPeriodId);
  return () => {
    const cur = presenceHandlers.get(academicPeriodId);
    cur?.delete(handler);
    if (cur && cur.size === 0) {
      presenceHandlers.delete(academicPeriodId);
      presenceByPeriod.delete(academicPeriodId);
      socket?.emit("presence.unwatch", { academicPeriodId });
    }
    closeIfUnused();
  };
}

/**
 * Ask to plot on a section. Resolves `{ ok: false, holder }` when someone else already is; resolves
 * `{ ok: true }` when the connection cannot answer in time, so plotting never waits on realtime.
 */
export function requestPlotLock(
  academicPeriodId: string,
  sectionId: string,
  activity?: PlotActivity,
): Promise<PlotLockResult> {
  if (typeof window === "undefined" || !academicPeriodId || !sectionId) return Promise.resolve({ ok: true });
  const entry = { academicPeriodId, sectionId, activity };
  ensureConnection();
  const s = socket;
  if (!s?.connected) {
    // Taken when the connection comes up (see "connect"); the server referees then.
    heldLocks.set(lockKey(academicPeriodId, sectionId), entry);
    return Promise.resolve({ ok: true });
  }
  return new Promise((resolve) => {
    s.timeout(LOCK_ACK_MS).emit(
      "plot.lock",
      entry,
      (err: Error | null, res: { ok?: boolean; holder?: PlotLock } | undefined) => {
        if (err || !res) {
          heldLocks.set(lockKey(academicPeriodId, sectionId), entry);
          return resolve({ ok: true });
        }
        if (res.ok === false && res.holder) return resolve({ ok: false, holder: res.holder });
        heldLocks.set(lockKey(academicPeriodId, sectionId), entry);
        resolve({ ok: true });
      },
    );
  });
}

/** Says what this window is now doing on a section it holds (e.g. the subject was picked). */
export function updatePlotLockActivity(academicPeriodId: string, sectionId: string, activity: PlotActivity): void {
  const key = lockKey(academicPeriodId, sectionId);
  const held = heldLocks.get(key);
  if (!held) return;
  const next = { ...held, activity };
  heldLocks.set(key, next);
  if (socket?.connected) socket.emit("plot.lock", next);
}

/** Hear about changes others finish in a term. Also follows the term's presence (same room). */
export function subscribePlotNotices(academicPeriodId: string, handler: NoticeHandler): () => void {
  if (typeof window === "undefined" || !academicPeriodId) return () => {};
  let set = noticeHandlers.get(academicPeriodId);
  if (!set) {
    set = new Set();
    noticeHandlers.set(academicPeriodId, set);
  }
  set.add(handler);
  const stopWatching = watchPlotPresence(academicPeriodId, () => {});
  return () => {
    const cur = noticeHandlers.get(academicPeriodId);
    cur?.delete(handler);
    if (cur && cur.size === 0) noticeHandlers.delete(academicPeriodId);
    stopWatching();
  };
}

/** Tell the others a change on a section is done (after the server confirmed it). */
export function sendPlotNotice(notice: {
  academicPeriodId: string;
  sectionId: string;
  kind: PlotNotice["kind"];
  detail: string;
  entryIds?: string[];
}): void {
  if (!notice.academicPeriodId || !notice.sectionId) return;
  if (socket?.connected) socket.emit("plot.notice", notice);
}

/** Done plotting on a section (window closed). */
export function releasePlotLock(academicPeriodId: string, sectionId: string): void {
  if (!academicPeriodId || !sectionId) return;
  const key = lockKey(academicPeriodId, sectionId);
  if (!heldLocks.delete(key)) return;
  socket?.emit("plot.unlock", { academicPeriodId, sectionId });
  closeIfUnused();
}

/** Force-drop the connection. Call on logout so the next user reconnects fresh. */
export function resetRealtime(): void {
  retryAttempt = 0;
  heldLocks.clear();
  presenceByPeriod.clear();
  closeConnection();
}
