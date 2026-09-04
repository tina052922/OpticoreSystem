/**
 * Browser-side HTTP client for the OptiCore Express backend.
 *
 * 🔒 Security contract
 * ────────────────────
 *   • Cookies are HTTP-only and set by the backend. They are NEVER read
 *     from JavaScript and NEVER written to localStorage / sessionStorage.
 *   • We do NOT attach `Authorization` headers in the browser. Auth is
 *     carried only by the `oc_at` / `oc_rt` HTTP-only cookies.
 *   • Every request uses `credentials: "include"` so the browser sends
 *     those cookies automatically (CORS on the backend is configured to
 *     allow this for FRONTEND_URL only).
 *   • Request / response bodies must never be logged — they may contain
 *     emails or password fields. Use the returned `ApiClientError` for
 *     UI display; it carries only safe, user-facing messages from the
 *     backend.
 */

import {
  API_CACHE_TTL,
  buildCacheKey,
  clearApiCache,
  defaultInvalidationPrefix,
  invalidateApiCache,
  readApiCache,
  readInFlight,
  trackInFlight,
  writeApiCache,
} from "./request-cache";
import type { CampusBrandingConfig, ResolvedCampusBranding } from "@/lib/system-configuration/campus-branding";

export {
  API_CACHE_TTL,
  clearApiCache,
  invalidateApiCache,
} from "./request-cache";

// ----- Configuration --------------------------------------------------------

/** On the server, reach Express directly. On the client, go through the Next.js rewrite (relative URL). */
const IS_SERVER = typeof window === "undefined";
export const API_BASE_URL = IS_SERVER
  ? (process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:4000").replace(/\/+$/, "")
  : "";

// ----- Types ----------------------------------------------------------------

export type Role =
  | "chairman_admin"
  | "college_admin"
  | "cas_admin"
  | "gec_chairman"
  | "doi_admin"
  | "instructor"
  | "student"
  | "visitor";

export type SafeUser = {
  id: string;
  email: string;
  role: Role;
  name: string | null;
  collegeId?: string | null;
  employeeId?: string | null;
  chairmanProgramId?: string | null;
  chairmanProgramCode?: string | null;
  chairmanProgramName?: string | null;
  profileImageUrl?: string | null;
  signatureImageUrl?: string | null;
  studentProfile?: { programId?: string; sectionId?: string; yearLevel?: number } | null;
  mustChangePassword: boolean;
};

export type ApiSuccess<T> = {
  success: true;
  message?: string;
  data: T;
};

export type ApiFailure = {
  success: false;
  error: {
    code: string;
    message: string;
    details?: unknown;
  };
};

export type ApiResponse<T> = ApiSuccess<T> | ApiFailure;

// 🌟 Bulletproof error class that handles undefined, null, or string bodies
export class ApiClientError extends Error {
  readonly status: number;
  readonly code: string;
  readonly details?: unknown;

  constructor(
    status: number,
    body: ApiFailure["error"] | string | undefined | null,
  ) {
    let message = "An unknown error occurred";
    let code = "UNKNOWN_ERROR";
    let details: unknown = undefined;

    if (typeof body === "string") {
      message = body;
    } else if (body && typeof body === "object") {
      message =
        ((body as Record<string, unknown>).message as string) ||
        ((body as Record<string, unknown>).error as string) ||
        "An error occurred";
      code =
        (body as Record<string, unknown>).code?.toString() || "UNKNOWN_ERROR";
      details = (body as Record<string, unknown>).details;
    }

    super(message);
    this.name = "ApiClientError";
    this.status = status;
    this.code = code;
    this.details = details;
  }
}

// ----- Shared Data Types (Mirror Backend) -----------------------------------

export type Pagination = { limit: number; offset: number; total: number };

export type College = { id: string; code: string; name: string };
export type Program = {
  id: string;
  code: string;
  name: string;
  collegeId: string;
};
export type Section = {
  id: string;
  programId: string;
  name: string;
  yearLevel: number;
  studentCount: number;
};
export type Subject = {
  id: string;
  code: string;
  subcode: string | null;
  title: string;
  lecUnits: number;
  lecHours: number;
  labUnits: number;
  labHours: number;
  programId: string;
  yearLevel: number;
};
export type Room = {
  id: string;
  code: string;
  building: string | null;
  floor: number | null;
  capacity: number | null;
  type: string | null;
  collegeId: string | null;
};

export type AcademicPeriod = {
  id: string;
  name: string;
  semester: string;
  academicYear: string;
  isCurrent: boolean;
  startDate: string | null;
  endDate: string | null;
};

export type Notification = {
  id: string;
  userId: string;
  message: string;
  isRead: boolean;
  createdAt: string;
};

export type AuditLogEntry = {
  id: string;
  actorId: string;
  collegeId: string | null;
  action: string;
  entityType: string;
  entityId: string | null;
  details: unknown;
  createdAt: string;
};

export type AccessRequestStatus = "pending" | "approved" | "rejected";
export type AccessScope = "evaluator" | "ins_forms" | "gec_vacant_slots";

export type AccessRequest = {
  id: string;
  requesterId: string;
  requesterName?: string;
  collegeId: string;
  status: AccessRequestStatus;
  scopes: string[];
  note: string | null;
  reviewedById: string | null;
  reviewedAt: string | null;
  expiresAt: string | null;
  createdAt: string;
  updatedAt: string;
};

export type SystemConfiguration = {
  id: string;
  campusDirectorSignatureImageUrl: string | null;
  doiSignatureImageUrl?: string | null;
  schedulingPolicy: unknown;
  branding?: CampusBrandingConfig | null;
  updatedAt: string;
};

export type DoiScheduleFinalization = {
  id: string;
  academicPeriodId: string;
  status: "pending" | "approved" | "rejected";
  signedByName: string | null;
  signedAt: string | null;
  signedAcknowledged: boolean;
  publishedAt: string | null;
  decidedById: string | null;
  decidedAt: string | null;
  notes: string | null;
  createdAt: string;
  updatedAt: string;
};

// ----- Core fetch wrapper ---------------------------------------------------

type ApiFetchOptions = Omit<RequestInit, "body"> & {
  body?: unknown;
  retryOn401?: boolean;
  cookieHeader?: string;
  signal?: AbortSignal;
  /**
   * Cache successful GET responses in-memory for this many ms and de-duplicate
   * concurrent calls for the same URL. Omit (or `0`) to always hit the network.
   * Ignored on the server and whenever `cookieHeader` is set — see
   * `lib/api/request-cache.ts` for why.
   */
  cacheTtlMs?: number;
  /** Bypass a cached value but still populate the cache with the fresh result. */
  forceRefresh?: boolean;
  /**
   * For mutating requests: cache path prefix to drop after success.
   * Defaults to the first two path segments; pass `null` to skip invalidation.
   */
  invalidates?: string | string[] | null;
};

function buildUrl(path: string): string {
  if (/^https?:\/\//i.test(path)) return path;
  const normalized = path.startsWith("/") ? path : `/${path}`;
  return `${API_BASE_URL}${normalized}`;
}

function isPlainObject(value: unknown): value is Record<string, unknown> {
  if (value === null || typeof value !== "object") return false;
  const proto = Object.getPrototypeOf(value);
  return proto === null || proto === Object.prototype;
}

async function readJsonSafely(res: Response): Promise<unknown> {
  if (res.status === 204) return null;
  const text = await res.text();
  if (!text) return null;
  try {
    return JSON.parse(text);
  } catch {
    return null;
  }
}

let inFlightRefresh: Promise<boolean> | null = null;

async function attemptRefresh(cookieHeader?: string): Promise<boolean> {
  if (inFlightRefresh) return inFlightRefresh;
  inFlightRefresh = (async () => {
    try {
      const res = await fetch(buildUrl("/api/auth/refresh"), {
        method: "POST",
        credentials: "include",
        headers: {
          accept: "application/json",
          ...(cookieHeader ? { cookie: cookieHeader } : {}),
        },
      });
      return res.ok;
    } catch {
      return false;
    } finally {
      setTimeout(() => {
        inFlightRefresh = null;
      }, 0);
    }
  })();
  return inFlightRefresh;
}

export async function apiFetch<T>(
  path: string,
  options: ApiFetchOptions = {},
): Promise<T> {
  const {
    body,
    method = body !== undefined ? "POST" : "GET",
    cookieHeader,
    signal,
    cacheTtlMs = 0,
    forceRefresh = false,
    invalidates,
  } = options;

  const upperMethod = method.toUpperCase();
  const isRead = upperMethod === "GET" || upperMethod === "HEAD";

  // Never cache on the server (module state is shared across users) and never
  // cache a request that carries an explicit cookie header (same reason).
  const cacheable =
    isRead && cacheTtlMs > 0 && !IS_SERVER && !cookieHeader && !signal;
  const cacheKey = cacheable ? buildCacheKey(upperMethod, buildUrl(path)) : "";

  if (cacheable) {
    if (!forceRefresh) {
      const cached = readApiCache<T>(cacheKey);
      if (cached.hit) return cached.value as T;

      const pending = readInFlight<T>(cacheKey);
      if (pending) return pending;
    }

    return trackInFlight(
      cacheKey,
      (async () => {
        const result = await apiFetchUncached<T>(path, options);
        writeApiCache(cacheKey, result, cacheTtlMs);
        return result;
      })(),
    );
  }

  const result = await apiFetchUncached<T>(path, options);

  // A successful write makes cached reads for that resource family stale.
  if (!isRead && !IS_SERVER && invalidates !== null) {
    const prefixes =
      invalidates === undefined
        ? [defaultInvalidationPrefix(path)]
        : Array.isArray(invalidates)
          ? invalidates
          : [invalidates];
    for (const prefix of prefixes) {
      if (prefix) invalidateApiCache(prefix);
    }
  }

  return result;
}

async function apiFetchUncached<T>(
  path: string,
  options: ApiFetchOptions = {},
): Promise<T> {
  const {
    body,
    headers,
    method = body !== undefined ? "POST" : "GET",
    retryOn401 = true,
    cookieHeader,
    signal,
    cacheTtlMs: _cacheTtlMs,
    forceRefresh: _forceRefresh,
    invalidates: _invalidates,
    ...rest
  } = options;

  /**
   * Tag mutations with this tab's realtime connection id so the server can
   * skip echoing the resulting event back to us — we already applied the
   * change locally. Reads don't produce events, so don't bother.
   *
   * Imported lazily to keep the realtime module out of the server bundle and
   * to avoid an import cycle (`realtime-client` imports `API_BASE_URL`).
   */
  let originHeader: Record<string, string> = {};
  if (!IS_SERVER && method.toUpperCase() !== "GET" && method.toUpperCase() !== "HEAD") {
    try {
      const { getRealtimeConnectionId } = await import(
        "@/lib/realtime/realtime-client"
      );
      const id = getRealtimeConnectionId();
      if (id) originHeader = { "x-opticore-connection-id": id };
    } catch {
      /* realtime unavailable — the event simply isn't suppressed */
    }
  }

  const init: RequestInit = {
    ...rest,
    method,
    signal,
    credentials: "include",
    headers: {
      accept: "application/json",
      ...(isPlainObject(body) || Array.isArray(body) ? { "content-type": "application/json" } : {}),
      ...(cookieHeader ? { cookie: cookieHeader } : {}),
      ...originHeader,
      ...(headers as Record<string, string> | undefined),
    },
    body:
      body === undefined
        ? undefined
        : isPlainObject(body) || Array.isArray(body)
          ? JSON.stringify(body)
          : (body as BodyInit),
  };

  if (!IS_SERVER) {
    const hdrs = new Headers(init.headers);
    hdrs.delete("authorization");
    hdrs.delete("Authorization");
    hdrs.delete("apikey");
    hdrs.delete("x-api-key");
    hdrs.delete("X-Api-Key");
    init.headers = hdrs;
  }

  let res: Response;
  try {
    res = await fetch(buildUrl(path), init);
  } catch (err) {
    throw new ApiClientError(0, {
      code: "NETWORK_ERROR",
      message:
        err instanceof Error
          ? `Cannot reach API (${err.message})`
          : "Cannot reach API",
    });
  }

  if (res.status === 401 && retryOn401 && path !== "/api/auth/refresh") {
    const refreshed = await attemptRefresh(cookieHeader);
    if (refreshed) {
      // Retry on the uncached path — the caller already owns the cache entry.
      return apiFetchUncached<T>(path, { ...options, retryOn401: false });
    }
  }

  const payload = await readJsonSafely(res);

  if (!res.ok) {
    if (
      payload &&
      typeof payload === "object" &&
      "success" in payload &&
      !(payload as ApiSuccess<unknown>).success
    ) {
      throw new ApiClientError(res.status, (payload as ApiFailure).error);
    }

    const errObj =
      payload && typeof payload === "object"
        ? (payload as Record<string, unknown>).error || payload
        : { code: "HTTP_ERROR", message: `Request failed (${res.status})` };

    throw new ApiClientError(res.status, errObj as ApiFailure["error"]);
  }

  if (!payload) return undefined as T;

  if (
    typeof payload === "object" &&
    "success" in payload &&
    (payload as ApiSuccess<unknown>).success
  ) {
    return (payload as ApiSuccess<T>).data;
  }

  return payload as T;
}

// ----- Additional types ----------------------------------------------------

export type WorkflowInboxMessage = {
  id: string;
  from: string;
  to: string;
  subject: string;
  body: string | null;
  status: string;
  createdAt: string;
  workflowStage: string | null;
  payload: unknown;
};

export type PortalId = "chairman" | "college" | "cas" | "gec" | "doi";

// ----- Typed grouped APIs ---------------------------------------------------
// ----- Helper for query strings -----
function qs(params: Record<string, unknown>): string {
  const sp = new URLSearchParams();
  for (const [k, v] of Object.entries(params)) {
    if (v === undefined || v === null || v === "") continue;
    sp.set(k, String(v));
  }
  const s = sp.toString();
  return s ? `?${s}` : "";
}

// ----- Missing API Groups ---------------------------------------------------

export const notificationsApi = {
  list(
    params: { unreadOnly?: boolean; limit?: number; offset?: number } = {},
    opts: { cookieHeader?: string; forceRefresh?: boolean } = {},
  ) {
    const flat = {
      ...params,
      unreadOnly: params.unreadOnly ? "true" : undefined,
    };
    return apiFetch<{
      notifications: Notification[];
      unread: number;
      pagination: Pagination;
    }>(`/api/notifications${qs(flat)}`, {
      method: "GET",
      cookieHeader: opts.cookieHeader,
      cacheTtlMs: API_CACHE_TTL.NOTIFICATIONS,
      forceRefresh: opts.forceRefresh,
    });
  },
  count(opts: { cookieHeader?: string } = {}) {
    return apiFetch<{ unread: number }>("/api/notifications/count", {
      method: "GET",
      cookieHeader: opts.cookieHeader,
    });
  },
  markRead(id: string) {
    return apiFetch<{ updated: true }>(`/api/notifications/${id}/read`, {
      method: "PATCH",
    });
  },
  markAllRead() {
    return apiFetch<{ updated: number }>("/api/notifications/read-all", {
      method: "POST",
    });
  },
};

export const semestersApi = {
  list(opts: { cookieHeader?: string; forceRefresh?: boolean } = {}) {
    return apiFetch<{ semesters: AcademicPeriod[] }>("/api/semesters", {
      method: "GET",
      cookieHeader: opts.cookieHeader,
      cacheTtlMs: API_CACHE_TTL.SEMESTERS,
      forceRefresh: opts.forceRefresh,
    });
  },
  current(opts: { cookieHeader?: string; forceRefresh?: boolean } = {}) {
    return apiFetch<{ semester: AcademicPeriod | null }>(
      "/api/semesters/current",
      {
        method: "GET",
        cookieHeader: opts.cookieHeader,
        cacheTtlMs: API_CACHE_TTL.SEMESTERS,
        forceRefresh: opts.forceRefresh,
      },
    );
  },
};

export const systemConfigApi = {
  get(opts: { cookieHeader?: string; forceRefresh?: boolean } = {}) {
    return apiFetch<{ config: SystemConfiguration }>(
      "/api/admin/system-configuration",
      {
        method: "GET",
        cookieHeader: opts.cookieHeader,
        cacheTtlMs: API_CACHE_TTL.SYSTEM_CONFIG,
        forceRefresh: opts.forceRefresh,
      },
    );
  },
  update(body: {
    campusDirectorSignatureImageUrl?: string | null;
    schedulingPolicy?: unknown;
    branding?: CampusBrandingConfig;
  }) {
    return apiFetch<{ config: SystemConfiguration }>(
      "/api/admin/system-configuration",
      {
        method: "PATCH",
        body,
        invalidates: ["/api/admin/system-configuration", "/api/public/branding"],
      },
    );
  },
  uploadLogo(file: File) {
    const formData = new FormData();
    formData.append("file", file);
    return apiFetch<{ url: string; branding: CampusBrandingConfig }>("/api/admin/branding/logo", {
      method: "POST",
      body: formData,
      invalidates: ["/api/admin/system-configuration", "/api/public/branding"],
    });
  },
  clearLogo() {
    return apiFetch<{ ok: true; branding: CampusBrandingConfig }>("/api/admin/branding/logo", {
      method: "DELETE",
      invalidates: ["/api/admin/system-configuration", "/api/public/branding"],
    });
  },
  uploadInsHeaderBanner(file: File) {
    const formData = new FormData();
    formData.append("file", file);
    return apiFetch<{ url: string; branding: CampusBrandingConfig }>(
      "/api/admin/branding/ins-header",
      {
        method: "POST",
        body: formData,
        invalidates: ["/api/admin/system-configuration", "/api/public/branding"],
      },
    );
  },
  clearInsHeaderBanner() {
    return apiFetch<{ ok: true; branding: CampusBrandingConfig }>("/api/admin/branding/ins-header", {
      method: "DELETE",
      invalidates: ["/api/admin/system-configuration", "/api/public/branding"],
    });
  },
};

export const auditLogApi = {
  list(
    params: { limit?: number; offset?: number } = {},
    opts: { cookieHeader?: string } = {},
  ) {
    return apiFetch<{ entries: AuditLogEntry[]; pagination: Pagination }>(
      `/api/audit${qs(params)}`,
      { method: "GET", cookieHeader: opts.cookieHeader },
    );
  },
  unreadCount(
    params: { since?: string } = {},
    opts: { cookieHeader?: string; forceRefresh?: boolean } = {},
  ) {
    return apiFetch<{ unread: number; unreadCount?: number }>(
      `/api/audit/unread-count${qs(params)}`,
      {
        method: "GET",
        cookieHeader: opts.cookieHeader,
        cacheTtlMs: API_CACHE_TTL.BADGE_COUNT,
        forceRefresh: opts.forceRefresh,
      },
    );
  },
};

export const policyReviewsApi = {
  list(
    params: { pendingOnly?: boolean } = {},
    opts: { cookieHeader?: string } = {},
  ) {
    const flat = { pendingOnly: params.pendingOnly ? "true" : undefined };
    return apiFetch<{ reviews: unknown[] }>(
      `/api/policies/reviews${qs(flat)}`,
      {
        method: "GET",
        cookieHeader: opts.cookieHeader,
      },
    );
  },
  pendingCount(
    params: { collegeId?: string } = {},
    opts: { cookieHeader?: string; forceRefresh?: boolean } = {},
  ) {
    return apiFetch<{ pending: number }>(
      `/api/policies/reviews/pending-count${qs(params)}`,
      {
        method: "GET",
        cookieHeader: opts.cookieHeader,
        cacheTtlMs: API_CACHE_TTL.BADGE_COUNT,
        forceRefresh: opts.forceRefresh,
      },
    );
  },
  review(body: {
    justificationId: string;
    decision: "accepted" | "rejected";
    note?: string | null;
  }) {
    return apiFetch<{ ok: true; justification: unknown; warning?: string }>(
      "/api/doi/policy-justification-review",
      {
        method: "PATCH",
        body,
      },
    );
  },
};
export const authApi = {
  async login(input: { email: string; password: string; rememberMe?: boolean }) {
    // Drop any cached responses belonging to a previously signed-in user
    // BEFORE the new session exists, so nothing can be read cross-account.
    clearApiCache();
    try {
      return await apiFetch<{
        user: SafeUser;
        session?: {
          access_token: string;
          refresh_token: string;
          expires_at: number;
        };
      }>("/api/auth/login", {
        method: "POST",
        body: input,
        retryOn401: false,
      });
    } finally {
      clearApiCache();
      // Reconnect under the new identity so topics are re-derived server-side.
      if (typeof window !== "undefined") {
        void import("@/lib/realtime/realtime-client")
          .then((m) => m.resetRealtime())
          .catch(() => undefined);
      }
    }
  },
  async logout() {
    try {
      return await apiFetch<{ loggedOut: true }>("/api/auth/logout", {
        method: "POST",
        retryOn401: false,
      });
    } finally {
      clearApiCache();
      // Drop the SSE stream: it was authorized for the previous session's
      // topics and must never carry over to the next user on this tab.
      if (typeof window !== "undefined") {
        void import("@/lib/realtime/realtime-client")
          .then((m) => m.resetRealtime())
          .catch(() => undefined);
      }
    }
  },
  me(opts: { cookieHeader?: string; forceRefresh?: boolean } = {}) {
    return apiFetch<{ user: SafeUser }>("/api/auth/me", {
      method: "GET",
      cookieHeader: opts.cookieHeader,
      cacheTtlMs: API_CACHE_TTL.AUTH_ME,
      forceRefresh: opts.forceRefresh,
    });
  },
  refresh() {
    return apiFetch<{ refreshed: true }>("/api/auth/refresh", {
      method: "POST",
      retryOn401: false,
    });
  },
  /**
   * Step 1 of password reset: emails a 6-digit code.
   *
   * ⚠️ Resolves identically whether or not an account exists — that is
   * deliberate (anti-enumeration), so the UI must NOT treat success as proof
   * the address is registered.
   */
  forgotPassword(email: string) {
    return apiFetch<{
      ok: true;
      otpRequired: true;
      expiresInMinutes: number;
      message: string;
    }>("/api/auth/forgot-password", {
      method: "POST",
      body: { email },
      retryOn401: false,
    });
  },
  /** Issues a NEW reset code, invalidating the previous one. Throttled. */
  resendPasswordResetCode(email: string) {
    return apiFetch<{
      ok: true;
      otpRequired: true;
      expiresInMinutes: number;
      message: string;
    }>("/api/auth/forgot-password/resend", {
      method: "POST",
      body: { email },
      retryOn401: false,
    });
  },
  /**
   * Step 2: exchanges a correct code for a single-use `resetTicket`.
   *
   * 🔒 The ticket authorises a password change — keep it in component state
   * only. Never write it to localStorage or a URL.
   *
   * Throws `ApiClientError` with `code: "EXPIRED"` or `"TOO_MANY_ATTEMPTS"`
   * when the request is gone server-side and retrying is pointless.
   */
  verifyPasswordResetCode(input: { email: string; code: string }) {
    return apiFetch<{
      ok: true;
      resetTicket: string;
      expiresInMinutes: number;
    }>("/api/auth/forgot-password/verify", {
      method: "POST",
      body: input,
      retryOn401: false,
    });
  },
  /** Step 3: redeems the ticket and sets the new password. */
  resetPassword(input: { resetTicket: string; newPassword: string }) {
    return apiFetch<{ ok: true; message: string }>(
      "/api/auth/forgot-password/reset",
      {
        method: "POST",
        body: input,
        retryOn401: false,
      },
    );
  },
};

export const registerApi = {
  /**
   * Instructor signup, step 1: emails a 6-digit code to the CTU address.
   *
   * ⚠️ Creates NO account. Even after the code is verified the applicant only
   * enters the chairman's approval queue — they cannot sign in until a chairman
   * approves and assigns an Employee ID.
   *
   * `employeeId` is advisory: the chairman sets the authoritative value at
   * approval, so do not present it to the user as final.
   *
   * Throws `ApiClientError` with `code`:
   *   `INVALID_EMAIL_DOMAIN` (400) — not an @ctu.edu.ph address
   *   `EMAIL_EXISTS` (409)         — already registered
   *   `ALREADY_PENDING` (409)      — a request is already awaiting review
   */
  instructor(input: {
    fullName: string;
    email: string;
    password: string;
    collegeId: string;
    employeeId?: string;
    [key: string]: unknown; // Additional faculty profile fields (server allowlists)
  }) {
    return apiFetch<{
      ok: true;
      otpRequired: true;
      email: string;
      expiresInMinutes: number;
      message: string;
    }>("/api/auth/register-instructor", {
      method: "POST",
      body: input,
      retryOn401: false,
    });
  },
  /** Instructor signup, step 2: confirms the code and queues for chairman review. */
  verifyInstructor(input: { email: string; code: string }) {
    return apiFetch<{
      ok: true;
      pendingApproval: true;
      email: string;
      message: string;
    }>("/api/auth/verify-instructor", {
      method: "POST",
      body: input,
      retryOn401: false,
    });
  },
  /** Issues a NEW instructor code, invalidating the previous one. */
  resendInstructorVerification(email: string) {
    return apiFetch<{
      ok: true;
      otpRequired: true;
      email: string;
      expiresInMinutes: number;
      message: string;
    }>("/api/auth/resend-instructor-verification", {
      method: "POST",
      body: { email },
      retryOn401: false,
    });
  },
  student(input: {
    fullName: string;
    email: string;
    password: string;
    programId: string;
    sectionId: string;
    yearLevel: number;
    studentId: string;
  }) {
    /**
     * Emails a 6-digit code and holds the signup in server memory. Nothing is
     * written to the database until `verifyEmail` succeeds.
     *
     * Throws `ApiClientError` with `code: "EMAIL_EXISTS"` (HTTP 409) when the
     * address already has an account.
     */
    return apiFetch<{
      ok: true;
      otpRequired: true;
      email: string;
      expiresInMinutes: number;
      message: string;
    }>("/api/auth/register-student", {
      method: "POST",
      body: input,
      retryOn401: false,
    });
  },
  /**
   * Confirms the emailed code and creates the student account.
   *
   * The code is single-use: the server drops the pending signup before it
   * starts creating anything, so a resubmit cannot create two accounts. A wrong
   * code throws with `attemptsLeft`; exhausting the budget cancels the signup.
   */
  verifyEmail(input: { email: string; code: string }) {
    return apiFetch<{
      ok: true;
      alreadyVerified: boolean;
      message: string;
      email?: string;
    }>("/api/auth/verify-email", {
      method: "POST",
      body: input,
      retryOn401: false,
    });
  },
  /** Issues a NEW code, invalidating the previous one. */
  resendVerification(email: string) {
    return apiFetch<{
      ok: true;
      otpRequired: true;
      email: string;
      expiresInMinutes: number;
      message: string;
    }>("/api/auth/resend-verification", {
      method: "POST",
      body: { email },
      retryOn401: false,
    });
  },
};

/** A verified instructor signup awaiting chairman approval. */
export type InstructorRequest = {
  id: string;
  email: string;
  deliveryEmail: string;
  fullName: string;
  collegeId: string;
  /** What the applicant typed. Advisory only — the chairman sets the real one. */
  claimedEmployeeId: string | null;
  /** Faculty profile fields from the registration form. */
  profile: Record<string, string | null> | null;
  status: "pending" | "approved" | "rejected";
  verifiedAt: string;
  reviewedAt: string | null;
  reviewerNotes: string | null;
  linkedUserId: string | null;
  createdAt: string;
};

/** An unclaimed placeholder faculty row a chairman can adopt at approval. */
export type LinkableFaculty = {
  id: string;
  name: string | null;
  email: string;
  employeeId: string | null;
};

/**
 * Chairman review queue for instructor self-registrations.
 *
 * 🔒 Scope is enforced server-side from the session's college — there is no
 * collegeId parameter to pass, deliberately.
 */
export const instructorRequestsApi = {
  list(status: "pending" | "approved" | "rejected" | "all" = "pending") {
    return apiFetch<{ requests: InstructorRequest[] }>(
      `/api/instructor-requests${qs({ status })}`,
      { method: "GET" },
    );
  },
  count() {
    return apiFetch<{ pending: number }>("/api/instructor-requests/count", {
      method: "GET",
    });
  },
  /** Placeholder faculty rows (created via Faculty Profile, never signed in). */
  linkableFaculty() {
    return apiFetch<{ candidates: LinkableFaculty[] }>(
      "/api/instructor-requests/linkable-faculty",
      { method: "GET" },
    );
  },
  /**
   * Creates the account.
   *
   * Pass `linkUserId` to adopt an existing placeholder — strongly preferred
   * when one exists, because already-plotted `ScheduleEntry` rows point at that
   * id and minting a new one would strand them. Otherwise pass `employeeId` to
   * create a fresh record.
   */
  approve(id: string, body: { employeeId?: string; linkUserId?: string }) {
    return apiFetch<{
      ok: true;
      userId: string;
      employeeId: string;
      message: string;
    }>(`/api/instructor-requests/${id}/approve`, { method: "POST", body });
  },
  reject(id: string, body: { reviewerNotes?: string } = {}) {
    return apiFetch<{ ok: true; message: string }>(
      `/api/instructor-requests/${id}/reject`,
      { method: "POST", body },
    );
  },
};

export const accessRequestsApi = {
  create(body: {
    targetCollegeId?: string;
    reason?: string;
    requestType?: string;
    scopes?: string[];
    note?: string;
  }) {
    return apiFetch<{ ok: true; request: AccessRequest }>(
      "/api/access-requests",
      {
        method: "POST",
        body,
      },
    );
  },
  getCollegeRequests() {
    return apiFetch<{ requests: AccessRequest[] }>(
      "/api/access-requests/college",
      {
        method: "GET",
      },
    );
  },
  review(
    id: string,
    body: { action: "approve" | "reject"; reviewerNotes?: string },
  ) {
    return apiFetch<{ ok: true; request: AccessRequest }>(
      `/api/access-requests/${id}`,
      {
        method: "PATCH",
        body,
      },
    );
  },
  list() {
    return apiFetch<{ requests: AccessRequest[] }>("/api/access-requests", {
      method: "GET",
    });
  },
  pendingCount(
    params: { collegeId?: string } = {},
    opts: { cookieHeader?: string; forceRefresh?: boolean } = {},
  ) {
    return apiFetch<{ pending: number }>(
      `/api/access-requests/pending-count${qs(params)}`,
      {
        method: "GET",
        cookieHeader: opts.cookieHeader,
        cacheTtlMs: API_CACHE_TTL.BADGE_COUNT,
        forceRefresh: opts.forceRefresh,
      },
    );
  },
};

export const doiApi = {
  uploadCampusDirectorSignature(file: File) {
    const formData = new FormData();
    formData.append("file", file);
    return apiFetch<{ url: string }>("/api/doi/signature", {
      method: "POST",
      body: formData,
      invalidates: ["/api/admin/system-configuration", "/api/catalog"],
    });
  },
  clearCampusDirectorSignature() {
    return apiFetch<{ ok: true }>("/api/doi/signature", {
      method: "DELETE",
      invalidates: ["/api/admin/system-configuration", "/api/catalog"],
    });
  },
  uploadElectronicSignature(file: File) {
    const formData = new FormData();
    formData.append("file", file);
    return apiFetch<{ url: string }>("/api/doi/electronic-signature", {
      method: "POST",
      body: formData,
      invalidates: ["/api/admin/system-configuration", "/api/catalog"],
    });
  },
  clearElectronicSignature() {
    return apiFetch<{ ok: true }>("/api/doi/electronic-signature", {
      method: "DELETE",
      invalidates: ["/api/admin/system-configuration", "/api/catalog"],
    });
  },
  getFinalization(academicPeriodId: string) {
    return apiFetch<{ finalization: DoiScheduleFinalization | null }>(
      `/api/doi/schedule-finalization?academicPeriodId=${encodeURIComponent(academicPeriodId)}`,
      { method: "GET" },
    );
  },
  getScheduleConflicts(academicPeriodId: string) {
    return schedulingApi.scopeConflictScan({
      academicPeriodId,
      mode: "doi_campus",
      collegeId: null,
      programId: null,
    });
  },
  patchFinalization(body: {
    academicPeriodId: string;
    action: "approve" | "reject" | "unpublish" | "unlock";
    signedByName?: string | null;
    signedAcknowledged?: boolean;
    notes?: string | null;
  }) {
    return apiFetch<{ finalization: DoiScheduleFinalization }>(
      "/api/doi/schedule-finalization",
      {
        method: "PATCH",
        body,
        invalidates: ["/api/doi/schedule-finalization", "/api/catalog"],
      },
    );
  },
};

export const adminApi = {
  getSystemConfiguration() {
    return apiFetch<{ config: SystemConfiguration }>(
      "/api/admin/system-configuration",
      {
        method: "GET",
      },
    );
  },
  updateSystemConfiguration(body: {
    campusDirectorSignatureImageUrl?: string;
    schedulingPolicy?: unknown;
    branding?: CampusBrandingConfig;
  }) {
    return apiFetch<{ ok: true; config: SystemConfiguration }>(
      "/api/admin/system-configuration",
      {
        method: "PATCH",
        body,
      },
    );
  },
  getAcademicPeriods() {
    return apiFetch<{ periods: AcademicPeriod[] }>(
      "/api/admin/academic-periods",
      {
        method: "GET",
      },
    );
  },
  createAcademicPeriod(body: {
    name: string;
    semester: string;
    academicYear: string;
    startDate: string;
    endDate: string;
    setCurrent?: boolean;
  }) {
    return apiFetch<{ ok: true; period: AcademicPeriod }>(
      "/api/admin/academic-periods",
      {
        method: "POST",
        body,
        // Period writes also change what `/api/semesters` returns.
        invalidates: ["/api/admin", "/api/semesters"],
      },
    );
  },
  updateAcademicPeriod(id: string, body: Partial<AcademicPeriod>) {
    return apiFetch<{ ok: true; period: AcademicPeriod }>(
      `/api/admin/academic-periods/${id}`,
      {
        method: "PATCH",
        body,
        invalidates: ["/api/admin", "/api/semesters"],
      },
    );
  },
  setCurrentAcademicPeriod(setCurrentId: string) {
    return apiFetch<{ ok: true; period: AcademicPeriod }>(
      "/api/admin/academic-periods/set-current",
      {
        method: "PATCH",
        body: { setCurrentId },
        // Changing the current term reshapes nearly every catalog read.
        invalidates: ["/api/admin", "/api/semesters", "/api/catalog"],
      },
    );
  },
};

export const auditApi = {
  getLogs() {
    return apiFetch<{ logs: AuditLogEntry[] }>("/api/audit", {
      method: "GET",
    });
  },
  getUnreadCount() {
    return apiFetch<{ unread?: number; unreadCount?: number }>("/api/audit/unread-count", {
      method: "GET",
    });
  },
  markAsRead(logIds: string[]) {
    return apiFetch<{ ok: true }>("/api/audit/mark-as-read", {
      method: "PATCH",
      body: { logIds },
    });
  },
};

export function recordScheduleWrite(input: {
  action: string;
  collegeId?: string | null;
  academicPeriodId?: string | null;
  details?: unknown;
}) {
  return apiFetch<{ ok: true }>("/api/audit/schedule-write", {
    method: "POST",
    body: input,
  }).catch(() => ({ ok: true as const }));
}

export const catalogApi = {
  colleges(opts: { forceRefresh?: boolean } = {}) {
    return apiFetch<{ colleges: { id: string; code: string; name: string }[] }>(
      "/api/catalog/colleges?extended=true",
      {
        method: "GET",
        cacheTtlMs: API_CACHE_TTL.CATALOG_STATIC,
        forceRefresh: opts.forceRefresh,
      },
    );
  },
  programs(opts: { forceRefresh?: boolean } = {}) {
    return apiFetch<{ programs: { id: string; code: string; name: string; collegeId: string }[] }>(
      "/api/catalog/programs",
      {
        method: "GET",
        cacheTtlMs: API_CACHE_TTL.CATALOG_STATIC,
        forceRefresh: opts.forceRefresh,
      },
    );
  },
  sections(opts: { forceRefresh?: boolean } = {}) {
    return apiFetch<{ sections: { id: string; name: string; programId: string; yearLevel: number }[] }>(
      "/api/catalog/sections",
      {
        method: "GET",
        cacheTtlMs: API_CACHE_TTL.CATALOG_STATIC,
        forceRefresh: opts.forceRefresh,
      },
    );
  },
  /** Bulk INS catalog payload (periods + entries + reference data). */
  insBundle<T>(opts: { forceRefresh?: boolean } = {}) {
    return apiFetch<T>("/api/catalog/ins-bundle", {
      method: "GET",
      cacheTtlMs: API_CACHE_TTL.INS_BUNDLE,
      forceRefresh: opts.forceRefresh,
    });
  },
  /** Schedule entries for a term. Short TTL — pollers pass `forceRefresh`. */
  scheduleEntries<T>(
    academicPeriodId: string,
    opts: { forceRefresh?: boolean } = {},
  ) {
    return apiFetch<T>(
      `/api/catalog/schedule-entries?academicPeriodId=${encodeURIComponent(academicPeriodId)}`,
      {
        method: "GET",
        cacheTtlMs: API_CACHE_TTL.SCHEDULE_ENTRIES,
        forceRefresh: opts.forceRefresh,
      },
    );
  },
};

export const collegeApi = {
  getSignerSettings(params: { collegeId?: string }) {
    return apiFetch<{
      settings: { insSignerDisplay: Record<string, unknown> | null };
      campusDirectorUserId?: string | null;
      contractSignerUserId?: string | null;
      collegeAdminSignatureImageUrl?: string | null;
      users?: { id: string; name: string; email: string; role: string }[];
    }>(
      `/api/college/signer-settings${qs(params)}`,
      { method: "GET" },
    );
  },
  patchSignerSettings(body: { collegeId: string; campusDirectorUserId?: string | null; contractSignerUserId?: string | null; insSignerDisplay?: Record<string, unknown> }) {
    return apiFetch<{ ok: true }>("/api/college/signer-settings", {
      method: "PATCH",
      body,
    });
  },
  uploadElectronicSignature(file: File, params: { collegeId?: string } = {}) {
    const formData = new FormData();
    formData.append("file", file);
    return apiFetch<{ url: string }>(
      `/api/college/electronic-signature${qs(params)}`,
      {
        method: "POST",
        body: formData,
        invalidates: ["/api/college", "/api/catalog"],
      },
    );
  },
  clearElectronicSignature(params: { collegeId?: string } = {}) {
    return apiFetch<{ ok: true }>(
      `/api/college/electronic-signature${qs(params)}`,
      {
        method: "DELETE",
        invalidates: ["/api/college", "/api/catalog"],
      },
    );
  },
  notifyGecReady(body: { academicPeriodId?: string; programId?: string; note?: string }) {
    return apiFetch<{ ok: true; notified: number; message: string }>("/api/college/notify-gec-ready", {
      method: "POST",
      body,
    });
  },
  notifyProgramPlotted(body: { academicPeriodId?: string; programId?: string; note?: string }) {
    return apiFetch<{ ok: true; notified: number; message: string }>("/api/college/notify-program-plotted", {
      method: "POST",
      body,
    });
  },
};

export const facultyProfileApi = {
  create(input: Record<string, unknown>) {
    return apiFetch<{ profile: Record<string, unknown> }>("/api/catalog/faculty-profiles", { method: "POST", body: input });
  },
  update(id: string, input: Record<string, unknown>) {
    return apiFetch<{ profile: Record<string, unknown> }>(`/api/catalog/faculty-profiles/${id}`, { method: "PUT", body: input });
  },
  delete(id: string) {
    return apiFetch<{ ok: true }>(`/api/catalog/faculty-profiles/${id}`, { method: "DELETE" });
  },
};

export const subjectCodesApi = {
  create(input: Record<string, unknown>) {
    return apiFetch<{ subject: Record<string, unknown> }>("/api/catalog/subjects", { method: "POST", body: input });
  },
  update(id: string, input: Record<string, unknown>) {
    return apiFetch<{ subject: Record<string, unknown> }>(`/api/catalog/subjects/${id}`, { method: "PUT", body: input });
  },
  delete(id: string) {
    return apiFetch<{ ok: true }>(`/api/catalog/subjects/${id}`, { method: "DELETE" });
  },
};

export const userAdminApi = {
  create(input: Record<string, unknown>) {
    return apiFetch<{ user: Record<string, unknown> }>("/api/catalog/users", { method: "POST", body: input });
  },
  update(id: string, input: Record<string, unknown>) {
    return apiFetch<{ user: Record<string, unknown> }>(`/api/catalog/users/${id}`, { method: "PUT", body: input });
  },
  delete(id: string) {
    return apiFetch<{ ok: true }>(`/api/catalog/users/${id}`, { method: "DELETE" });
  },
};

export const authMutationsApi = {
  changePassword(input: { currentPassword: string; newPassword: string }) {
    return apiFetch<{ ok: true }>("/api/auth/change-password", { method: "POST", body: input });
  },
};

export const campusInsSettingsApi = {
  upsert(input: Record<string, unknown>) {
    return apiFetch<{ settings: Record<string, unknown> }>("/api/catalog/campus-ins-settings", { method: "PUT", body: input });
  },
};

export const publicApi = {
  healthCheck() {
    return apiFetch<{ status: "ok"; uptime: number; timestamp: string }>(
      "/api/public/health",
      {
        method: "GET",
        retryOn401: false,
      },
    );
  },
  getCampusNavigation() {
    return apiFetch<{
      buildings: { id: string; name: string; rooms: Room[] }[];
    }>("/api/public/campus-navigation", {
      method: "GET",
      retryOn401: false,
    });
  },
  getBranding(opts: { forceRefresh?: boolean } = {}) {
    return apiFetch<{ branding: ResolvedCampusBranding }>("/api/public/branding", {
      method: "GET",
      retryOn401: false,
      cacheTtlMs: API_CACHE_TTL.SYSTEM_CONFIG,
      forceRefresh: opts.forceRefresh,
    });
  },
};

// ----- Scheduling API -------------------------------------------------------

export type CampusConflictScanInput = {
  academicPeriodId: string;
  mode: "doi_campus" | "gec_campus" | "chairman_program" | "college";
  collegeId: string | null;
  programId: string | null;
  programMode?: "day" | "night" | null;
};

export type CampusConflictScanResult = {
  entryCount: number;
  conflictingEntryIds: string[];
  issueSummaries: string[];
  issues: Array<{ entryId: string; type: string; message: string; relatedEntryId?: string }>;
  enrichedIssues: unknown[];
};

export const schedulingApi = {
  scopeConflictScan(input: CampusConflictScanInput) {
    return apiFetch<CampusConflictScanResult>("/api/scheduling/scope-conflict-scan", {
      method: "POST",
      body: input,
    });
  },
};

// ----- Inbox API ------------------------------------------------------------

export const inboxApi = {
  share(input: {
    subject: string;
    body: string;
    view: string;
    payload?: unknown;
  }) {
    return apiFetch<{ ok: true }>("/api/inbox/share", {
      method: "POST",
      body: input,
    });
  },
  listPortal(portal: string) {
    return apiFetch<{ mail: WorkflowInboxMessage[]; sent: WorkflowInboxMessage[] }>(
      `/api/inbox/${portal}`,
      { method: "GET" },
    );
  },
  forward(input: {
    mailFor: string;
    sentFor: string;
    fromLabel: string;
    toLabel: string;
    subject: string;
    body: string;
    workflowStage: string;
    payload?: unknown;
  }) {
    return apiFetch<{ ok: true }>("/api/inbox/forward", {
      method: "POST",
      body: input,
    });
  },
};

export const authExtraApi = {
  changePassword(body: { currentPassword?: string; newPassword: string }) {
    return apiFetch<{ ok: true }>("/api/auth/change-password", {
      method: "POST",
      body,
    });
  },
};

export const profileApi = {
  uploadAvatar(file: File) {
    const formData = new FormData();
    formData.append("file", file);
    return apiFetch<{ url: string }>("/api/profile/avatar", {
      method: "POST",
      body: formData,
    });
  },
  clearAvatar() {
    return apiFetch<{ ok: true }>("/api/profile/avatar", {
      method: "DELETE",
    });
  },
  uploadSignature(file: File) {
    const formData = new FormData();
    formData.append("file", file);
    return apiFetch<{ url: string }>("/api/profile/signature", {
      method: "POST",
      body: formData,
    });
  },
  clearSignature() {
    return apiFetch<{ ok: true }>("/api/profile/signature", {
      method: "DELETE",
    });
  },
};

export const gecApi = {
  scheduleSaveNotify(body: {
    collegeId: string;
    academicPeriodId: string;
    sectionId: string;
    sectionName: string;
    rowCount?: number;
  }) {
    return apiFetch<{ ok: true }>("/api/gec/schedule-save-notify", {
      method: "POST",
      body,
    });
  },
};
