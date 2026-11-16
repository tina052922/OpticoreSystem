/**
 * Which faculty a Program Chairman may plot.
 *
 * A chairman plots their own department's load, so the instructor picker must hold only that
 * department's faculty. It used to be scoped by college, which put every sibling department's
 * instructors in the list — a BSIT chairman could assign a BIT-AUTO instructor.
 *
 * The rule matches the one Faculty Profile already applies to a chairman's roster:
 *   • the instructor's home department (`User.chairmanProgramId`) must be this department, and
 *   • GEC instructors from other departments are not department faculty, but every GEC (or "both")
 *     instructor can still be plotted into a program's general education classes — see
 *     `filterInstructorsForProgramPlot`.
 *
 * College Admin and DOI are not narrowed here: they work across departments by design.
 */

import { isGecInstructorUser } from "@/lib/faculty/faculty-category";

export type InstructorScopeUser = {
  id: string;
  chairmanProgramId?: string | null;
  facultyCategory?: string | null;
};

/**
 * True when this instructor belongs to the department: their home department is it, whatever their
 * category. A GEC (or "both") instructor whose home department is BSIT belongs to BSIT too — some
 * GEC instructors are drawn from a program. A GEC instructor with no department belongs to none.
 */
export function isInstructorInDepartment(
  user: InstructorScopeUser,
  programId: string | null | undefined,
): boolean {
  const department = (programId ?? "").trim();
  if (!department) return true;
  return (user.chairmanProgramId ?? "").trim() === department;
}

/**
 * The department's faculty, plus anyone already on a plotted row.
 *
 * `alreadyPlottedIds` keeps existing schedule rows readable: an instructor assigned before the
 * department was recorded would otherwise vanish from the picker and leave the row unresolvable.
 * They stay selectable on rows they already hold, and setting their department in Faculty Profile
 * returns them to the list properly.
 */
export function filterInstructorsForDepartment<T extends InstructorScopeUser>(
  users: readonly T[],
  programId: string | null | undefined,
  alreadyPlottedIds: ReadonlySet<string> = new Set(),
): T[] {
  const department = (programId ?? "").trim();
  if (!department) return [...users];
  return users.filter(
    (u) => isInstructorInDepartment(u, department) || alreadyPlottedIds.has(u.id),
  );
}

/**
 * The faculty offered when plotting a PROGRAM's classes (Program Chairman, College Admin, DOI):
 * that department's own instructors AND every GEC instructor.
 *
 * A program's sections take general education subjects too, so the person plotting BSIT must be
 * able to pick a GEC instructor as well as a BSIT one. GEC instructors are campus-wide, so they are
 * offered whatever their recorded college. The reverse does not hold: the GEC Chairman sees GEC
 * instructors only (`filterInstructorsForGec`).
 *
 * With no department (`programId` blank) everyone passes, as before. Anyone already on a plotted row
 * is kept so existing rows stay readable.
 */
export function filterInstructorsForProgramPlot<T extends InstructorScopeUser>(
  users: readonly T[],
  programId: string | null | undefined,
  alreadyPlottedIds: ReadonlySet<string> = new Set(),
): T[] {
  const department = (programId ?? "").trim();
  if (!department) return [...users];
  return users.filter(
    (u) => isInstructorInDepartment(u, department) || isGecInstructorUser(u) || alreadyPlottedIds.has(u.id),
  );
}

/**
 * The department's own faculty first (any category), then the GEC instructors from elsewhere, each
 * A–Z — the order the plot picker shows. Without a department, program-only before GEC.
 */
export function sortDepartmentThenGec<T extends InstructorScopeUser & { name?: string | null }>(
  users: readonly T[],
  programId?: string | null,
): T[] {
  const department = (programId ?? "").trim();
  const rank = (u: T) =>
    department ? (isInstructorInDepartment(u, department) ? 0 : 1) : isGecInstructorUser(u) ? 1 : 0;
  return [...users].sort((a, b) => {
    const d = rank(a) - rank(b);
    if (d !== 0) return d;
    return (a.name ?? "").localeCompare(b.name ?? "");
  });
}

/**
 * The faculty a GEC Chairman may plot.
 *
 * Mirror of the department rule, for the role that has no department. The GEC evaluator used to
 * offer every plottable faculty in the college and merely sort the GEC ones to the top, so a GEC
 * chairman could assign a BSIT instructor to a general education slot — and a BSIT chairman would
 * then find that instructor's time taken by a plot they had no part in.
 *
 * `alreadyPlottedIds` keeps existing rows readable for the same reason as the department filter: an
 * instructor assigned before this rule existed stays selectable on the row they already hold.
 */
export function filterInstructorsForGec<T extends InstructorScopeUser>(
  users: readonly T[],
  alreadyPlottedIds: ReadonlySet<string> = new Set(),
): T[] {
  return users.filter((u) => isGecInstructorUser(u) || alreadyPlottedIds.has(u.id));
}

/**
 * Instructors already assigned on the rows currently being edited.
 *
 * This is the escape hatch both filters above take as `alreadyPlottedIds`, and it has to be drawn
 * from the rows in front of the user — not from every plotted row in the term. Passing the whole
 * campus readmits anyone who holds a plot anywhere, which hands the picker back almost everyone and
 * quietly undoes the scoping: the GEC evaluator offered every plotted instructor on campus despite
 * filtering to GEC first.
 *
 * With no section chosen there is no row to keep readable, so nothing is exempt.
 */
export function instructorIdsOnRowsInScope(
  entries: readonly {
    sectionId?: string | null;
    academicPeriodId?: string | null;
    instructorId?: string | null;
  }[],
  scope: { sectionId?: string | null; academicPeriodId?: string | null },
): Set<string> {
  const sectionId = (scope.sectionId ?? "").trim();
  const periodId = (scope.academicPeriodId ?? "").trim();
  const ids = new Set<string>();
  if (!sectionId) return ids;

  for (const e of entries) {
    if ((e.sectionId ?? "").trim() !== sectionId) continue;
    if (periodId && (e.academicPeriodId ?? "").trim() !== periodId) continue;
    const instructorId = (e.instructorId ?? "").trim();
    if (instructorId) ids.add(instructorId);
  }
  return ids;
}

/**
 * The faculty a College Admin may plot.
 *
 * Their college's department instructors, without the GEC ones. General education is plotted by the
 * GEC Chairman across every college, so a GEC instructor appearing here lets two people schedule the
 * same person — the same reason they are excluded from a Chairman's list and from a College Admin's
 * Faculty Profile roster.
 *
 * DOI is not narrowed by this: they work across every college and post by design.
 */
export function filterInstructorsExcludingGec<T extends InstructorScopeUser>(
  users: readonly T[],
  alreadyPlottedIds: ReadonlySet<string> = new Set(),
): T[] {
  return users.filter((u) => !isGecInstructorUser(u) || alreadyPlottedIds.has(u.id));
}
