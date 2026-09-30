import { normalizeInstructorValidation } from "@/lib/auth/instructor-validation";
import type { User } from "@/types/db";

export type RosterUser = Pick<User, "role"> & {
  instructorValidation?: string | null;
};

/**
 * Who belongs on the Faculty Profile roster.
 *
 * Deliberately wider than `isPlottableFacultyUser`. That one answers "may this person be put on a
 * schedule?", and a self-registration awaiting a chairman's approval may not. The Faculty Profile
 * page asks a different question — "whose profile is on file?" — and a pending registration is
 * precisely the profile someone needs to open, read and complete.
 *
 * Filtering the roster by plottability meant a faculty member could register, have a FacultyProfile
 * row written for them, and still be invisible on the page that exists to manage profiles.
 *
 * A rejected registration is not faculty and stays out.
 */
export function isFacultyRosterUser(user: RosterUser): boolean {
  if (user.role !== "instructor") return false;
  return normalizeInstructorValidation(user.instructorValidation) !== "rejected";
}

/**
 * True when the account is on the roster but cannot be scheduled yet.
 *
 * The row is shown either way; this is what marks it, so nobody plans a load around a faculty member
 * the evaluator will refuse to offer.
 */
export function isAwaitingFacultyApproval(user: { instructorValidation?: string | null }): boolean {
  return normalizeInstructorValidation(user.instructorValidation) === "pending";
}
