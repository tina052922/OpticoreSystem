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

export type ScheduleChangeStatus =
  | "pending"
  | "approved"
  | "rejected"
  | "approved_with_solution";

export type ScheduleChangeRequest = {
  id: string;
  academicPeriodId: string;
  scheduleEntryId: string;
  instructorId: string;
  instructorName?: string;
  subjectCode?: string;
  sectionName?: string;
  currentDay?: string;
  currentStartTime?: string;
  currentEndTime?: string;
  collegeId: string;
  requestedDay: string;
  requestedStartTime: string;
  requestedEndTime: string;
  reason: string;
  status: ScheduleChangeStatus;
  conflictSeverity: "none" | "small" | "large" | null;
  conflictDetails: unknown;
  adminSuggestion: string | null;
  reviewedById: string | null;
  reviewedAt: string | null;
  createdAt: string;
  updatedAt: string;
};

export type SystemConfiguration = {
  id: string;
  campusDirectorSignatureImageUrl: string | null;
  schedulingPolicy: unknown;
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
    headers,
    method = body !== undefined ? "POST" : "GET",
    retryOn401 = true,
    cookieHeader,
    signal,
    ...rest
  } = options;

  const init: RequestInit = {
    ...rest,
    method,
    signal,
    credentials: "include",
    headers: {
      accept: "application/json",
      ...(isPlainObject(body) || Array.isArray(body) ? { "content-type": "application/json" } : {}),
      ...(cookieHeader ? { cookie: cookieHeader } : {}),
      ...(headers as Record<string, string> | undefined),
    },
    body:
      body === undefined
        ? undefined
        : isPlainObject(body) || Array.isArray(body)
          ? JSON.stringify(body)
          : (body as BodyInit),
  };

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
      return apiFetch<T>(path, { ...options, retryOn401: false });
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
    opts: { cookieHeader?: string } = {},
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
  list(opts: { cookieHeader?: string } = {}) {
    return apiFetch<{ semesters: AcademicPeriod[] }>("/api/semesters", {
      method: "GET",
      cookieHeader: opts.cookieHeader,
    });
  },
  current(opts: { cookieHeader?: string } = {}) {
    return apiFetch<{ semester: AcademicPeriod | null }>(
      "/api/semesters/current",
      {
        method: "GET",
        cookieHeader: opts.cookieHeader,
      },
    );
  },
};

export const systemConfigApi = {
  get(opts: { cookieHeader?: string } = {}) {
    return apiFetch<{ config: SystemConfiguration }>(
      "/api/admin/system-configuration",
      {
        method: "GET",
        cookieHeader: opts.cookieHeader,
      },
    );
  },
  update(body: {
    campusDirectorSignatureImageUrl?: string | null;
    schedulingPolicy?: unknown;
  }) {
    return apiFetch<{ config: SystemConfiguration }>(
      "/api/admin/system-configuration",
      {
        method: "PATCH",
        body,
      },
    );
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
    opts: { cookieHeader?: string } = {},
  ) {
    return apiFetch<{ unread: number }>(
      `/api/audit/unread-count${qs(params)}`,
      {
        method: "GET",
        cookieHeader: opts.cookieHeader,
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
    opts: { cookieHeader?: string } = {},
  ) {
    return apiFetch<{ pending: number }>(
      `/api/policies/reviews/pending-count${qs(params)}`,
      {
        method: "GET",
        cookieHeader: opts.cookieHeader,
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
  login(input: { email: string; password: string; rememberMe?: boolean }) {
    return apiFetch<{
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
  },
  logout() {
    return apiFetch<{ loggedOut: true }>("/api/auth/logout", {
      method: "POST",
      retryOn401: false,
    });
  },
  me(opts: { cookieHeader?: string } = {}) {
    return apiFetch<{ user: SafeUser }>("/api/auth/me", {
      method: "GET",
      cookieHeader: opts.cookieHeader,
    });
  },
  refresh() {
    return apiFetch<{ refreshed: true }>("/api/auth/refresh", {
      method: "POST",
      retryOn401: false,
    });
  },
  forgotPassword(email: string) {
    return apiFetch<{ sent: true }>("/api/auth/forgot-password", {
      method: "POST",
      body: { email },
      retryOn401: false,
    });
  },
};

export const registerApi = {
  instructor(input: {
    fullName: string;
    email: string;
    employeeId: string;
    collegeId: string;
    [key: string]: unknown; // Allow additional profile fields safely
  }) {
    return apiFetch<{ ok: true; message: string; temporaryPassword: string }>(
      "/api/auth/register-instructor",
      {
        method: "POST",
        body: input,
        retryOn401: false,
      },
    );
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
    return apiFetch<{ ok: true }>("/api/auth/register-student", {
      method: "POST",
      body: input,
      retryOn401: false,
    });
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
    opts: { cookieHeader?: string } = {},
  ) {
    return apiFetch<{ pending: number }>(
      `/api/access-requests/pending-count${qs(params)}`,
      { method: "GET", cookieHeader: opts.cookieHeader },
    );
  },
};

export const scheduleChangeApi = {
  facultyRequest(body: {
    scheduleEntryId: string;
    requestedDay: string;
    requestedStartTime: string;
    requestedEndTime: string;
    reason: string;
  }) {
    return apiFetch<{ ok: true; id: string }>("/api/schedule-change/faculty", {
      method: "POST",
      body,
    });
  },
  create(body: {
    scheduleEntryId: string;
    requestedDay: string;
    requestedStartTime: string;
    requestedEndTime: string;
    reason: string;
  }) {
    return apiFetch<{ ok: true; id: string }>("/api/schedule-change/faculty", {
      method: "POST",
      body,
    });
  },
  instructorEntries(params: { periodId: string }) {
    return apiFetch<{ entries: { id: string; subject: string; day: string; startTime: string; endTime: string; section: string }[]; periodName?: string }>(
      `/api/schedule-change/instructor-entries?periodId=${encodeURIComponent(params.periodId)}`,
      { method: "GET" },
    );
  },
  list() {
    return apiFetch<{ requests: ScheduleChangeRequest[]; collegeId?: string }>(
      "/api/schedule-change/college",
      { method: "GET" },
    );
  },
  collegeList() {
    return apiFetch<{ requests: ScheduleChangeRequest[] }>(
      "/api/schedule-change/college",
      { method: "GET" },
    );
  },
  review(
    id: string,
    body: { action: "approve" | "reject"; adminSuggestion?: string },
  ) {
    return apiFetch<{ ok: true; status: "approved" | "rejected" }>(
      `/api/schedule-change/${id}`,
      {
        method: "PATCH",
        body,
      },
    );
  },
  pendingCount(
    params: { collegeId?: string } = {},
    opts: { cookieHeader?: string } = {},
  ) {
    return apiFetch<{ pending: number }>(
      `/api/schedule-change/pending-count${qs(params)}`,
      { method: "GET", cookieHeader: opts.cookieHeader },
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
    });
  },
  clearCampusDirectorSignature() {
    return apiFetch<{ ok: true }>("/api/doi/signature", {
      method: "DELETE",
    });
  },
  getFinalization(academicPeriodId: string) {
    return apiFetch<{ finalization: DoiScheduleFinalization | null }>(
      `/api/doi/schedule-finalization?academicPeriodId=${encodeURIComponent(academicPeriodId)}`,
      { method: "GET" },
    );
  },
  getScheduleConflicts(academicPeriodId: string) {
    return apiFetch<CampusConflictScanResult>(
      `/api/scheduling/scope-conflict-scan?academicPeriodId=${encodeURIComponent(academicPeriodId)}&mode=doi_campus`,
      { method: "GET" },
    );
  },
  patchFinalization(body: {
    academicPeriodId: string;
    action: "approve" | "reject";
    signedByName?: string | null;
    signedAcknowledged?: boolean;
    notes?: string | null;
  }) {
    return apiFetch<{ finalization: DoiScheduleFinalization }>(
      "/api/doi/schedule-finalization",
      {
        method: "PATCH",
        body,
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
      },
    );
  },
  updateAcademicPeriod(id: string, body: Partial<AcademicPeriod>) {
    return apiFetch<{ ok: true; period: AcademicPeriod }>(
      `/api/admin/academic-periods/${id}`,
      {
        method: "PATCH",
        body,
      },
    );
  },
  setCurrentAcademicPeriod(setCurrentId: string) {
    return apiFetch<{ ok: true; period: AcademicPeriod }>(
      "/api/admin/academic-periods/set-current",
      {
        method: "PATCH",
        body: { setCurrentId },
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
    return apiFetch<{ unreadCount: number }>("/api/audit/unread-count", {
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
  });
}

export const catalogApi = {
  colleges() {
    return apiFetch<{ colleges: { id: string; code: string; name: string }[] }>(
      "/api/catalog/colleges?extended=true",
      { method: "GET" },
    );
  },
  programs() {
    return apiFetch<{ programs: { id: string; code: string; name: string; collegeId: string }[] }>(
      "/api/catalog/programs",
      { method: "GET" },
    );
  },
  sections() {
    return apiFetch<{ sections: { id: string; name: string; programId: string; yearLevel: number }[] }>(
      "/api/catalog/sections",
      { method: "GET" },
    );
  },
};

export const collegeApi = {
  getSignerSettings(params: { collegeId?: string }) {
    return apiFetch<{
      settings: { insSignerDisplay: Record<string, unknown> | null };
      campusDirectorUserId?: string | null;
      contractSignerUserId?: string | null;
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
};

// ----- Scheduling API -------------------------------------------------------

export type CampusConflictScanInput = {
  academicPeriodId: string;
  mode: "doi_campus" | "gec_campus" | "chairman_program" | "college";
  collegeId: string | null;
  programId: string | null;
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
    return apiFetch<{ ok: true }>("/api/gec/evaluator-save-notify", {
      method: "POST",
      body,
    });
  },
};
