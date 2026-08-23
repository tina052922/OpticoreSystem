/**
 * In-memory GET response cache + in-flight request de-duplication for `apiFetch`.
 *
 * 🔒 Security contract
 * ────────────────────
 *   • This cache is **browser-only**. It is never used on the server, because
 *     server-side module state is shared across *all* concurrent user requests —
 *     caching `/api/auth/me` there would leak one user's identity to another.
 *     `apiFetch` enforces this with an `IS_SERVER` guard AND by refusing to
 *     cache any request that carries an explicit `cookieHeader`.
 *   • The cache lives in the tab's JS heap only. Nothing is written to
 *     localStorage / sessionStorage / IndexedDB, so no auth-adjacent payload
 *     survives a reload.
 *   • `clearApiCache()` MUST be called on login and logout so a second user on
 *     the same tab can never read the first user's cached responses.
 *
 * Behaviour
 * ─────────
 *   • Only successful GET responses are cached. Errors are never cached, so a
 *     transient 500 doesn't get pinned for the whole TTL.
 *   • Concurrent callers for the same key share a single in-flight promise
 *     (this is what collapses the "same URL 3x on mount" bursts).
 *   • Values are structurally cloned on read so one consumer mutating a
 *     response (`.sort()`, `.push()`) can't corrupt another's copy.
 */

/** Default TTLs per endpoint family, in ms. Tuned to how volatile each resource is. */
export const API_CACHE_TTL = {
  /** Identity rarely changes mid-session; matches the old useCurrentUser TTL. */
  AUTH_ME: 5 * 60_000,
  /** Academic periods change only when an admin edits them (which force-refreshes). */
  SEMESTERS: 5 * 60_000,
  /** Scheduling policy / signatures — admin-edited, broadcast-invalidated. */
  SYSTEM_CONFIG: 5 * 60_000,
  /** Colleges / programs / sections: effectively static reference data. */
  CATALOG_STATIC: 10 * 60_000,
  /** INS bundle embeds schedule entries, so keep it short. */
  INS_BUNDLE: 60_000,
  /** Short: only meant to collapse concurrent mount bursts, not to hide edits. */
  SCHEDULE_ENTRIES: 15_000,
  /** Same rationale — the 30s poller force-refreshes past this. */
  NOTIFICATIONS: 15_000,
  /**
   * Sidebar badge counts. Short by design: this only collapses the burst from
   * several shells/nav components mounting at once, since each poller passes
   * `forceRefresh` and therefore never reads a stale count.
   */
  BADGE_COUNT: 10_000,
} as const;

/** Hard cap so a long-lived tab can't grow the cache without bound. */
const MAX_ENTRIES = 200;

type CacheRecord = { value: unknown; expiresAt: number };

const store = new Map<string, CacheRecord>();
const inFlight = new Map<string, Promise<unknown>>();

/**
 * Normalized cache key: `METHOD absolute-path?sorted&query`.
 * Query params are sorted so `?a=1&b=2` and `?b=2&a=1` share an entry.
 */
export function buildCacheKey(method: string, url: string): string {
  let pathname = url;
  let search = "";
  try {
    const base =
      typeof window === "undefined" ? "http://internal.invalid" : window.location.origin;
    const parsed = new URL(url, base);
    pathname = `${parsed.origin === base ? "" : parsed.origin}${parsed.pathname}`;
    const params = [...parsed.searchParams.entries()].sort(([a], [b]) =>
      a === b ? 0 : a < b ? -1 : 1,
    );
    search = params.length
      ? `?${params.map(([k, v]) => `${k}=${v}`).join("&")}`
      : "";
  } catch {
    /* Non-parseable URL — fall back to the raw string. */
  }
  return `${method.toUpperCase()} ${pathname}${search}`;
}

function cloneValue<T>(value: T): T {
  if (value === null || typeof value !== "object") return value;
  try {
    return structuredClone(value);
  } catch {
    // Non-cloneable payload (Blob streams etc.) — hand back the reference.
    return value;
  }
}

/**
 * Returns `{ hit: true, value }` on a live entry. The `hit` flag is required
 * because `undefined` is a legitimate cached value (204 / empty body).
 */
export function readApiCache<T>(key: string): { hit: boolean; value?: T } {
  const record = store.get(key);
  if (!record) return { hit: false };
  if (record.expiresAt <= Date.now()) {
    store.delete(key);
    return { hit: false };
  }
  return { hit: true, value: cloneValue(record.value) as T };
}

export function writeApiCache(key: string, value: unknown, ttlMs: number): void {
  if (ttlMs <= 0) return;
  // Refresh insertion order so eviction is LRU-ish rather than strict FIFO.
  store.delete(key);
  store.set(key, { value, expiresAt: Date.now() + ttlMs });

  while (store.size > MAX_ENTRIES) {
    const oldest = store.keys().next();
    if (oldest.done) break;
    store.delete(oldest.value);
  }
}

export function readInFlight<T>(key: string): Promise<T> | null {
  return (inFlight.get(key) as Promise<T> | undefined) ?? null;
}

/** Registers a shared promise and auto-clears it once settled (success or failure). */
export function trackInFlight<T>(key: string, promise: Promise<T>): Promise<T> {
  inFlight.set(key, promise as Promise<unknown>);
  void promise
    .catch(() => undefined)
    .finally(() => {
      if (inFlight.get(key) === (promise as Promise<unknown>)) inFlight.delete(key);
    });
  return promise;
}

export function deleteApiCacheKey(key: string): void {
  store.delete(key);
}

/**
 * Drops cached entries whose path starts with `prefix` (e.g. `/api/catalog`).
 * In-flight requests are intentionally left alone — they were issued before the
 * mutation landed, but their results are dropped rather than cached because
 * `apiFetch` re-checks invalidation state on settle is not worth the complexity;
 * short TTLs bound the staleness window instead.
 */
export function invalidateApiCache(prefix: string): void {
  if (!prefix) return;
  for (const key of [...store.keys()]) {
    // Key format: "GET /api/catalog/programs?x=1"
    const space = key.indexOf(" ");
    const path = space === -1 ? key : key.slice(space + 1);
    if (path.startsWith(prefix)) store.delete(key);
  }
}

/** Full reset. Call on login and logout. */
export function clearApiCache(): void {
  store.clear();
  inFlight.clear();
}

/**
 * Default write-invalidation scope for a mutating request: the first two path
 * segments. `POST /api/catalog/schedule-entries-upsert` → busts `/api/catalog`,
 * which covers `ins-bundle` and `schedule-entries` in one shot.
 */
export function defaultInvalidationPrefix(path: string): string | null {
  const clean = path.split("?")[0];
  const segments = clean.split("/").filter(Boolean);
  if (segments.length < 2) return null;
  return `/${segments[0]}/${segments[1]}`;
}
