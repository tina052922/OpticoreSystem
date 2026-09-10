/**
 * Instructor teaching category (registration → User.facultyCategory).
 *
 * - `program` — home department faculty (`User.chairmanProgramId` set)
 * - `gec` — GEC instructor; may teach across departments (chairmanProgramId null)
 */

export const FACULTY_CATEGORY_PROGRAM = "program" as const;
export const FACULTY_CATEGORY_GEC = "gec" as const;

export type FacultyCategory =
  | typeof FACULTY_CATEGORY_PROGRAM
  | typeof FACULTY_CATEGORY_GEC;

export function parseFacultyCategory(raw: unknown): FacultyCategory {
  const s = typeof raw === "string" ? raw.trim().toLowerCase() : "";
  if (s === FACULTY_CATEGORY_GEC || s === "gec_instructor" || s === "gec-instructor") {
    return FACULTY_CATEGORY_GEC;
  }
  return FACULTY_CATEGORY_PROGRAM;
}

export function isGecFacultyCategory(raw: unknown): boolean {
  return parseFacultyCategory(raw) === FACULTY_CATEGORY_GEC;
}

/** True when a catalog User row is a GEC instructor. */
export function isGecInstructorUser(user: {
  facultyCategory?: string | null;
} | null | undefined): boolean {
  return isGecFacultyCategory(user?.facultyCategory);
}
