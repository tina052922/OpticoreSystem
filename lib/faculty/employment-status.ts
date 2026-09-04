/**
 * Faculty employment status for `FacultyProfile.status` — only two stored values (no redundant labels).
 * Load policy treats non-resident faculty as the capped tier; everything else uses resident/designation caps.
 */

export const FACULTY_EMPLOYMENT_RESIDENT = "Resident" as const;
export const FACULTY_EMPLOYMENT_NON_RESIDENT = "Non-resident" as const;

export type FacultyEmploymentStatus =
  | typeof FACULTY_EMPLOYMENT_RESIDENT
  | typeof FACULTY_EMPLOYMENT_NON_RESIDENT;

/**
 * Matches the non-resident tier, including rows stored under the previous "Part-time" label.
 *
 * Anchored on purpose: a bare `.includes("part")` also matches the substring inside "de**part**ment",
 * which wrongly caps resident faculty and triggers false overload / justification flows.
 */
const NON_RESIDENT_STATUS_PATTERN = /^(non[-\s]?resident|part[-\s]?time)\b/;

export function isNonResidentFacultyStatus(status: string | null | undefined): boolean {
  const s = (status ?? "").trim().toLowerCase();
  if (!s) return false;
  return NON_RESIDENT_STATUS_PATTERN.test(s);
}

/** Map DB/free-text (e.g. legacy "Organic", "Permanent", "Part-time") to the canonical pair for UI + storage. */
export function normalizeFacultyProfileStatus(raw: string | null | undefined): FacultyEmploymentStatus {
  return isNonResidentFacultyStatus(raw) ? FACULTY_EMPLOYMENT_NON_RESIDENT : FACULTY_EMPLOYMENT_RESIDENT;
}
