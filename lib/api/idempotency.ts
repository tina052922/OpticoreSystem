/**
 * Client half of the backend's Idempotency-Key support (opticore-backend/src/middlewares/idempotency.ts).
 *
 * Every write the web app sends (POST/PUT/PATCH/DELETE) carries a fresh `Idempotency-Key`. When the
 * request is retried — the connection dropped, or the server answered "already being processed" —
 * the SAME key goes out again, so the server returns the first result instead of saving twice.
 */

export const IDEMPOTENCY_HEADER = "Idempotency-Key";

/** How many extra tries a write gets after a network failure or an "in progress" 409. */
export const WRITE_RETRY_LIMIT = 4;

export function newIdempotencyKey(): string {
  const c = (globalThis as { crypto?: Crypto }).crypto;
  if (c?.randomUUID) return c.randomUUID();
  // Old browsers: still unique enough for a 24-hour key.
  return `k-${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}-${Math.random().toString(36).slice(2)}`;
}

export function isWriteMethod(method: string): boolean {
  const m = method.toUpperCase();
  return m === "POST" || m === "PUT" || m === "PATCH" || m === "DELETE";
}

/** A proxy (Next's /api rewrite, a load balancer) could not reach the backend: down or restarting. */
const PROXY_FAILURE = new Set([502, 503, 504]);

/**
 * Whether a failed write may be sent again with the same key: the request never got an answer
 * (status 0), the proxy in front of the backend could not reach it (502/503/504, or a 500 with no
 * JSON body — Next's rewrite answers "socket hang up" that way, while the backend's own errors are
 * always JSON), or the server is still running the first copy (409 IDEMPOTENCY_IN_PROGRESS).
 * The same Idempotency-Key makes a resend safe: a write that did land is never saved twice.
 * Anything else is a real answer and is returned to the caller.
 */
export function shouldRetryWrite(err: { status?: number; code?: string } | null | undefined, attempt: number): boolean {
  if (!err || attempt >= WRITE_RETRY_LIMIT) return false;
  if (err.status === 0) return true;
  if (err.status !== undefined && PROXY_FAILURE.has(err.status)) return true;
  if (err.status === 500 && err.code === "HTTP_ERROR") return true;
  return err.status === 409 && err.code === "IDEMPOTENCY_IN_PROGRESS";
}

/** Wait before retry `attempt` (0-based): 0.4 s, 1 s, 2 s, 4 s — long enough for a backend restart. */
export function writeRetryDelayMs(attempt: number): number {
  return [400, 1000, 2000, 4000][attempt] ?? 4000;
}

/**
 * Identity of a write for collapsing double clicks: two identical writes started while the first
 * is still on its way share one request. Only JSON-able bodies are compared; uploads (FormData,
 * Blob) return null and are never collapsed.
 */
export function writeDedupeKey(method: string, url: string, body: unknown): string | null {
  if (body !== undefined && body !== null) {
    if (typeof body !== "object") return null;
    const proto = Object.getPrototypeOf(body);
    if (!Array.isArray(body) && proto !== Object.prototype && proto !== null) return null;
  }
  try {
    return `${method.toUpperCase()} ${url}\n${body === undefined ? "" : JSON.stringify(body)}`;
  } catch {
    return null;
  }
}
