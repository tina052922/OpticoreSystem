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
  // Program and GEC Chairmen teach and are listed with their department's faculty.
  if (user.role === "chairman_admin" || user.role === "gec_chairman") return true;
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
 *  • **GEC Chairman** (`gecOnly`) — everyone who teaches general education: GEC instructors and
 *    "both" instructors, from any department. Program-only instructors are not shown.
 *  • **Program Chairman** (`lockedProgramId`) — everyone whose home department is theirs, whatever
 *    the category: a GEC or "both" instructor who belongs to BSIT is on BSIT's roster (marked GEC).
 *  • **College Admin** (`excludeGec`) — their college's department faculty. A GEC instructor with NO
 *    department is left out (the GEC Chairman keeps them); one with a department is shown.
 *  • **DOI** (none of the three) — everyone on the roster in scope.
 *
 * `isFacultyRosterUser` still decides who is faculty at all; this narrows that list to the viewer.
 */
export function isFacultyVisibleToRosterViewer(
  user: RosterUser & { facultyCategory?: string | null; chairmanProgramId?: string | null },
  viewer: {
    gecOnly?: boolean;
    lockedProgramId?: string | null;
    excludeGec?: boolean;
    /** Service Chair's area: only the general-subject instructors of that area (and themselves). */
    serviceAreaId?: string | null;
  },
): boolean {
  if (!isFacultyRosterUser(user)) return false;

  const teachesGec = isGecFacultyCategory(user.facultyCategory) || user.role === "gec_chairman";
  const home = (user.chairmanProgramId ?? "").trim();
  if (viewer.gecOnly) {
    if (!teachesGec) return false;
    const mine = (viewer.serviceAreaId ?? "").trim();
    const theirs = ((user as { serviceAreaId?: string | null }).serviceAreaId ?? "").trim();
    // Someone with no area yet (registered before areas) stays visible so they can be placed.
    return !mine || !theirs || mine === theirs;
  }
  if (viewer.excludeGec && teachesGec && !home) return false;

  const locked = (viewer.lockedProgramId ?? "").trim();
  if (!locked) return true;
  if (home) return home === locked;
  // No department recorded: a GEC instructor belongs to no department; anyone else stays visible so
  // a half-filled profile is not stranded.
  return !teachesGec;
}
