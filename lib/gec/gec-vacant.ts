/**
 * Placeholder `User` for ScheduleEntry rows that represent an unfilled GEC slot.
 * Must match `supabase/migrations/20260413120000_gec_chairman_schedule_placeholder_and_rls.sql`.
 */
export const GEC_VACANT_INSTRUCTOR_USER_ID =
  process.env.NEXT_PUBLIC_GEC_VACANT_INSTRUCTOR_ID?.trim() || "a0000000-0000-4000-8000-000000000099";

/** CHED-style general education codes we treat as GEC-chair scope (editable when vacant). */
export function isGecCurriculumSubjectCode(code: string): boolean {
  const u = code.trim().toUpperCase();
  return u.startsWith("GEC-") || u.startsWith("GEE-");
}

/** Vacant = GEC/GEE subject row still assigned to the TBD placeholder instructor. */
export function isGecVacantScheduleEntry(
  entry: { instructorId: string; subjectId: string },
  subjectById: Map<string, { code: string }>,
): boolean {
  const sub = subjectById.get(entry.subjectId);
  if (!sub || !isGecCurriculumSubjectCode(sub.code)) return false;
  return entry.instructorId === GEC_VACANT_INSTRUCTOR_USER_ID;
}
