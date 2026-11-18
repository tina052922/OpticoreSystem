/**
 * Placeholder `User` for ScheduleEntry rows that represent an unfilled GEC slot.
 * Must match `supabase/migrations/20260413120000_gec_chairman_schedule_placeholder_and_rls.sql`.
 * Hardcoded (not NEXT_PUBLIC_) so no project secrets are compiled into the browser.
 */
export const GEC_VACANT_INSTRUCTOR_USER_ID = "a0000000-0000-4000-8000-000000000099";

/** CHED-style general education codes we treat as GEC-chair scope (editable when vacant). */
export function isGecCurriculumSubjectCode(code: string): boolean {
  const u = code.trim().toUpperCase();
  return u.startsWith("GEC-") || u.startsWith("GEE-");
}

/**
 * The signed-in Service Chair's area code (migration 035), set once by their scheduler. Subjects
 * tagged with it in Subject Codes (Subject area) are theirs to plot, like GEC-/GEE- codes.
 * Null for everyone else, which keeps the plain GEC rule.
 */
let activeServiceAreaCode: string | null = null;
/** CAS College Admin: every general subject (GEC-/GEE- codes and any area-tagged subject). */
let anyGeneralSubjectScope = false;

export function setActiveServiceAreaCode(code: string | null | undefined): void {
  const c = String(code ?? "").trim().toLowerCase();
  activeServiceAreaCode = c || null;
}

/** PE / PATHFit / NSTP by code, or a general category. */
function isGeneralCategoryOrCode(sub: { code: string; category?: string | null }): boolean {
  const u = sub.code.trim().toUpperCase();
  if (/^(PE\b|PE\s|PE-|PE\d|PATHFIT|NSTP)/.test(u)) return true;
  return ["gec", "gee", "pe", "nstp"].includes(String(sub.category ?? "").trim().toLowerCase());
}

export function setAnyGeneralSubjectScope(on: boolean): void {
  anyGeneralSubjectScope = on;
}

/**
 * A general subject the current scheduler may plot. Mirrors the server
 * (`subjectBelongsToServiceArea`):
 *   • Service Chair (area set): every GEC-/GEE- subject, plus subjects tagged with their area;
 *   • CAS College Admin: any GEC-/GEE- code or area-tagged subject;
 *   • otherwise: GEC-/GEE- codes (the original rule).
 */
export function isServiceAreaSubject(
  sub: { code: string; subjectArea?: string | null; category?: string | null } | null | undefined,
): boolean {
  if (!sub) return false;
  const gecCode = isGecCurriculumSubjectCode(sub.code);
  const area = String(sub.subjectArea ?? "").trim().toLowerCase();
  // Not strict: a Service Chair plots any general subject of a section (GEC-/GEE-, PE, NSTP, area-tagged).
  if (activeServiceAreaCode) return gecCode || Boolean(area) || isGeneralCategoryOrCode(sub);
  if (anyGeneralSubjectScope) return gecCode || Boolean(area) || isGeneralCategoryOrCode(sub);
  return gecCode;
}

/** GEC/GEE (or own service-area) curriculum row, vacant or assigned — Service Chair scope. */
export function isGecCurriculumScheduleEntry(
  entry: { subjectId: string },
  subjectById: Map<string, { code: string; subjectArea?: string | null }>,
): boolean {
  return isServiceAreaSubject(subjectById.get(entry.subjectId));
}

/** Vacant = GEC/GEE subject row still assigned to the TBD placeholder instructor. */
export function isGecVacantScheduleEntry(
  entry: { instructorId: string; subjectId: string },
  subjectById: Map<string, { code: string; subjectArea?: string | null }>,
): boolean {
  if (!isGecCurriculumScheduleEntry(entry, subjectById)) return false;
  return entry.instructorId === GEC_VACANT_INSTRUCTOR_USER_ID;
}
