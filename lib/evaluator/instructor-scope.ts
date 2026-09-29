/**
 * Which faculty a Program Chairman may plot.
 *
 * A chairman plots their own department's load, so the instructor picker must hold only that
 * department's faculty. It used to be scoped by college, which put every sibling department's
 * instructors in the list — a BSIT chairman could assign a BIT-AUTO instructor.
 *
 * The rule matches the one Faculty Profile already applies to a chairman's roster:
 *   • the instructor's home department (`User.chairmanProgramId`) must be this department, and
 *   • GEC instructors are excluded — they are college-scoped and the GEC Chairman plots them.
 *
 * College Admin and DOI are not narrowed here: they work across departments by design.
 */

import { isGecInstructorUser } from "@/lib/faculty/faculty-category";

export type InstructorScopeUser = {
  id: string;
  chairmanProgramId?: string | null;
  facultyCategory?: string | null;
};

/** True when this instructor belongs to the department. */
export function isInstructorInDepartment(
  user: InstructorScopeUser,
  programId: string | null | undefined,
): boolean {
  const department = (programId ?? "").trim();
  if (!department) return true;
  // A GEC instructor has no home department and is plotted by the GEC Chairman.
  if (isGecInstructorUser(user)) return false;
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
