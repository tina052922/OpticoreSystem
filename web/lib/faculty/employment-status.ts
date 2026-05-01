/**
 * Faculty employment status for `FacultyProfile.status` — only two stored values (no redundant labels).
 * Load policy treats any value containing "part" (case-insensitive) as part-time; everything else as organic.
 */

export const FACULTY_EMPLOYMENT_ORGANIC = "Organic" as const;
export const FACULTY_EMPLOYMENT_PART_TIME = "Part-time" as const;

export type FacultyEmploymentStatus = typeof FACULTY_EMPLOYMENT_ORGANIC | typeof FACULTY_EMPLOYMENT_PART_TIME;

/** Map DB/free-text (e.g. legacy "Permanent") to the canonical pair for UI + storage. */
export function normalizeFacultyProfileStatus(raw: string | null | undefined): FacultyEmploymentStatus {
  const s = (raw ?? "").toLowerCase();
  if (s.includes("part")) return FACULTY_EMPLOYMENT_PART_TIME;
  return FACULTY_EMPLOYMENT_ORGANIC;
}
