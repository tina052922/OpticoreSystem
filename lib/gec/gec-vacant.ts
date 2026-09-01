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

/** GEC/GEE curriculum row (vacant or already assigned) — GEC Chairman scope. */
export function isGecCurriculumScheduleEntry(
  entry: { subjectId: string },
  subjectById: Map<string, { code: string }>,
): boolean {
  const sub = subjectById.get(entry.subjectId);
  return Boolean(sub && isGecCurriculumSubjectCode(sub.code));
}

/** Vacant = GEC/GEE subject row still assigned to the TBD placeholder instructor. */
export function isGecVacantScheduleEntry(
  entry: { instructorId: string; subjectId: string },
  subjectById: Map<string, { code: string }>,
): boolean {
  if (!isGecCurriculumScheduleEntry(entry, subjectById)) return false;
  return entry.instructorId === GEC_VACANT_INSTRUCTOR_USER_ID;
}
