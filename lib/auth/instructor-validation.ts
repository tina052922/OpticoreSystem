import type { User, UserRole } from "@/types/db";

export type InstructorValidation = "pending" | "active" | "rejected";

export function normalizeInstructorValidation(value: unknown): InstructorValidation {
  const raw = typeof value === "string" ? value.trim().toLowerCase() : "";
  if (raw === "pending" || raw === "rejected") return raw;
  return "active";
}

export function isFacultyStaffRole(role: UserRole | string | null | undefined): boolean {
  return role === "instructor" || role === "chairman_admin";
}

/** Active instructors + chairmen. Pending/rejected self-registrations cannot be assigned on plots. */
export function isPlottableFacultyUser(
  user: Pick<User, "role"> & { instructorValidation?: InstructorValidation | string | null },
): boolean {
  if (user.role === "chairman_admin") return true;
  if (user.role !== "instructor") return false;
  return normalizeInstructorValidation(user.instructorValidation) === "active";
}
