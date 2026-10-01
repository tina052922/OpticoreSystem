import { normalizeInstructorValidation } from "@/lib/auth/instructor-validation";
import { isGecFacultyCategory } from "@/lib/faculty/faculty-category";
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

/**
 * Who a given admin sees on the Faculty Profile roster.
 *
 * Three audiences, three answers:
 *
 *  • **GEC Chairman** (`gecOnly`) — the GEC instructors, and only those. General education is taught
 *    across every department, so the roster is defined by the instructor's category rather than by
 *    a department. Anyone enrolled from that page is recorded as one.
 *  • **Program Chairman** (`lockedProgramId`) — their own department. GEC instructors are excluded
 *    even if their home department matches, because their load belongs to the GEC Chairman.
 *  • **College Admin** (`excludeGec`) — their college's department instructors. GEC instructors are
 *    left out for the same reason they are for a Chairman: their load belongs to the GEC Chairman,
 *    who plots it across every college.
 *  • **DOI** (none of the three) — everyone on the roster in scope.
 *
 * `isFacultyRosterUser` still decides who is faculty at all; this narrows that list to the viewer.
 */
export function isFacultyVisibleToRosterViewer(
  user: RosterUser & { facultyCategory?: string | null; chairmanProgramId?: string | null },
  viewer: { gecOnly?: boolean; lockedProgramId?: string | null; excludeGec?: boolean },
): boolean {
  if (!isFacultyRosterUser(user)) return false;

  const isGec = isGecFacultyCategory(user.facultyCategory);
  if (viewer.gecOnly) return isGec;
  if (viewer.excludeGec && isGec) return false;

  const locked = (viewer.lockedProgramId ?? "").trim();
  if (!locked) return true;
  if (isGec) return false;

  const home = (user.chairmanProgramId ?? "").trim();
  // No department recorded: left visible, so a half-filled profile is not stranded.
  return !home || home === locked;
}
