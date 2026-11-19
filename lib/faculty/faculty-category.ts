/**
 * Instructor teaching category (registration → User.facultyCategory).
 *
 * - `program` — department faculty. Home department (`User.chairmanProgramId`) required.
 * - `gec`     — GEC instructor; teaches general education across departments. A home department is
 *               OPTIONAL: some GEC instructors are drawn from a program and still belong to it.
 * - `both`    — teaches both: a program instructor who also takes GEC classes. Home department required.
 *
 * "Teaches GEC" (`gec` or `both`) is what puts someone on the GEC Chairperson's roster and pickers;
 * the home department is what puts them on that department's roster. A `both` instructor of BSIT is
 * therefore on BSIT's list AND the GEC Chairperson's, marked GEC.
 *
 * Keep in sync with opticore-backend/src/lib/faculty-category.ts.
 */

export const FACULTY_CATEGORY_PROGRAM = "program" as const;
export const FACULTY_CATEGORY_GEC = "gec" as const;
export const FACULTY_CATEGORY_BOTH = "both" as const;

export type FacultyCategory =
  | typeof FACULTY_CATEGORY_PROGRAM
  | typeof FACULTY_CATEGORY_GEC
  | typeof FACULTY_CATEGORY_BOTH;

/** Select options, in the order every form lists them. */
export const FACULTY_CATEGORY_OPTIONS: readonly { value: FacultyCategory; label: string }[] = [
  { value: FACULTY_CATEGORY_PROGRAM, label: "Program instructor" },
  { value: FACULTY_CATEGORY_GEC, label: "General Subject instructor" },
  { value: FACULTY_CATEGORY_BOTH, label: "Both — program and general subject instructor" },
];

export function parseFacultyCategory(raw: unknown): FacultyCategory {
  const s = typeof raw === "string" ? raw.trim().toLowerCase() : "";
  if (s === FACULTY_CATEGORY_BOTH || s === "program_gec" || s === "gec_program" || s === "program+gec") {
    return FACULTY_CATEGORY_BOTH;
  }
  if (s === FACULTY_CATEGORY_GEC || s === "gec_instructor" || s === "gec-instructor") {
    return FACULTY_CATEGORY_GEC;
  }
  return FACULTY_CATEGORY_PROGRAM;
}

/** Teaches general education: `gec` or `both`. */
export function isGecFacultyCategory(raw: unknown): boolean {
  const c = parseFacultyCategory(raw);
  return c === FACULTY_CATEGORY_GEC || c === FACULTY_CATEGORY_BOTH;
}

/** Whether this category must name a home department (`program`, `both`). */
export function facultyCategoryRequiresDepartment(raw: unknown): boolean {
  return parseFacultyCategory(raw) !== FACULTY_CATEGORY_GEC;
}

/**
 * True when a catalog User row teaches general education (GEC or both) — including a Service Chair
 * (`gec_chairman`), who heads a general-subject area and teaches those subjects too.
 */
export function isGecInstructorUser(user: {
  facultyCategory?: string | null;
  role?: string | null;
} | null | undefined): boolean {
  return user?.role === "gec_chairman" || isGecFacultyCategory(user?.facultyCategory);
}

/** Short badge for lists: "General", "General + Program", or "" for a program-only instructor. */
export function facultyCategoryBadge(raw: unknown): string {
  const c = parseFacultyCategory(raw);
  if (c === FACULTY_CATEGORY_BOTH) return "General + Program";
  if (c === FACULTY_CATEGORY_GEC) return "General";
  return "";
}

export function facultyCategoryLabel(raw: unknown): string {
  const c = parseFacultyCategory(raw);
  return FACULTY_CATEGORY_OPTIONS.find((o) => o.value === c)?.label ?? "Program instructor";
}
