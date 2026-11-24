import type { User, UserRole } from "@/types/db";

export type InstructorValidation = "pending" | "active" | "rejected";

export function normalizeInstructorValidation(value: unknown): InstructorValidation {
  const raw = typeof value === "string" ? value.trim().toLowerCase() : "";
  if (raw === "pending" || raw === "rejected") return raw;
  return "active";
}

/** A College Admin (a legacy `cas_admin` is one too): they may teach as well as administer. */
export function isCollegeAdminRole(role: UserRole | string | null | undefined): boolean {
  return role === "college_admin" || role === "cas_admin";
}

export function isFacultyStaffRole(role: UserRole | string | null | undefined): boolean {
  return role === "instructor" || role === "chairman_admin" || role === "gec_chairman" || isCollegeAdminRole(role);
}

/**
 * Active instructors + chairpersons (Program Chairs and Service Chairs) + College Admins, who all may
 * teach. A College Admin is offered only for their own college's sections (see
 * `filterInstructorsForProgramPlot`). Pending/rejected self-registrations cannot be assigned on plots.
 */
export function isPlottableFacultyUser(
  user: Pick<User, "role"> & { instructorValidation?: InstructorValidation | string | null },
): boolean {
  if (user.role === "chairman_admin" || user.role === "gec_chairman" || isCollegeAdminRole(user.role)) return true;
  if (user.role !== "instructor") return false;
  return normalizeInstructorValidation(user.instructorValidation) === "active";
}
