/**
 * Client half of the backend's Idempotency-Key support (opticore-backend/src/middlewares/idempotency.ts).
 *
 * Every write the web app sends (POST/PUT/PATCH/DELETE) carries a fresh `Idempotency-Key`. When the
 * request is retried — the connection dropped, or the server answered "already being processed" —
 * the SAME key goes out again, so the server returns the first result instead of saving twice.
 */

export const IDEMPOTENCY_HEADER = "Idempotency-Key";

/** How many extra tries a write gets after a network failure or an "in progress" 409. */
export const WRITE_RETRY_LIMIT = 2;

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

/**
 * Whether a failed write may be sent again with the same key: the request never got an answer
 * (status 0), or the server is still running the first copy (409 IDEMPOTENCY_IN_PROGRESS).
 * Anything else is a real answer and is returned to the caller.
 */
export function shouldRetryWrite(err: { status?: number; code?: string } | null | undefined, attempt: number): boolean {
  if (!err || attempt >= WRITE_RETRY_LIMIT) return false;
  return err.status === 0 || (err.status === 409 && err.code === "IDEMPOTENCY_IN_PROGRESS");
}

/** Wait before retry `attempt` (0-based): 400 ms, then 1 s. */
export function writeRetryDelayMs(attempt: number): number {
  return attempt === 0 ? 400 : 1000;
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
