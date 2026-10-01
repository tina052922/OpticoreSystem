/**
 * The posts DOI staffs on the Campus Accounts page, and which of them admit only one holder.
 *
 * Mirrored in `opticore-backend/src/lib/campus-account-posts.ts`. Keep the two identical: the form
 * uses this to decide what it is saving, and the server uses it to enforce the same rule, so a stale
 * tab or a crafted request cannot create a post the UI would have refused.
 *
 * Most posts are one per thing: a College Admin per college, a Chairman per department. The GEC
 * Chairman is not — general education is taught in every college, so there is one for the campus.
 * That makes it a singleton rather than a row in the department list, which is why it needs a post
 * id of its own instead of a program id.
 */

/** The two lists on the page. A tab is not a role: the Chairmen tab can save a GEC Chairman. */
export type CampusAccountTab = "college_admin" | "chairman_admin";

/** What actually lands in `User.role`. */
export type CampusAccountSaveRole = CampusAccountTab | "gec_chairman";

/**
 * The GEC Chairman's post id.
 *
 * Deliberately not a program id — nothing in `Program` corresponds to it, and the Chairmen list is
 * keyed by program. Prefixed so it can never collide with a real id.
 */
export const GEC_CHAIRMAN_POST_ID = "__gec_chairman__";
export const GEC_CHAIRMAN_POST_CODE = "GEC";
export const GEC_CHAIRMAN_POST_NAME = "General Education — campus-wide";

/** Roles limited to one holder on the whole campus, whatever the assignment. */
export function isCampusSingletonRole(role: string | null | undefined): boolean {
  return (role ?? "").trim() === "gec_chairman";
}

/** The role a save targets, given the open tab and the post chosen in it. */
export function saveRoleForPost(tab: CampusAccountTab, postId: string | null | undefined): CampusAccountSaveRole {
  if (tab === "chairman_admin" && (postId ?? "").trim() === GEC_CHAIRMAN_POST_ID) return "gec_chairman";
  return tab;
}

/**
 * The post an existing account occupies, so a list can find its holder.
 *
 * Returns null for an account that holds no post here — including a College Admin or Chairman whose
 * assignment column was never set, which must not be mistaken for holding every post.
 */
export function postIdForAccount(account: {
  role?: string | null;
  collegeId?: string | null;
  chairmanProgramId?: string | null;
}): string | null {
  const role = (account.role ?? "").trim();
  if (role === "gec_chairman") return GEC_CHAIRMAN_POST_ID;
  if (role === "college_admin") return (account.collegeId ?? "").trim() || null;
  if (role === "chairman_admin") return (account.chairmanProgramId ?? "").trim() || null;
  return null;
}

/** Which tab a role is listed under. The GEC Chairman sits with the Chairmen. */
export function tabForSaveRole(role: CampusAccountSaveRole): CampusAccountTab {
  return role === "college_admin" ? "college_admin" : "chairman_admin";
}

/**
 * The college and program a save assigns.
 *
 * The GEC Chairman gets neither: a college would scope their INS pages to it, and they plot general
 * education across all of them. The app reads a null college as campus-wide.
 */
export function assignmentForSaveRole(
  role: CampusAccountSaveRole,
  postId: string,
  programCollegeId?: string | null,
): { collegeId: string | null; programId: string | null } {
  if (role === "gec_chairman") return { collegeId: null, programId: null };
  if (role === "college_admin") return { collegeId: postId.trim() || null, programId: null };
  return { collegeId: (programCollegeId ?? "").trim() || null, programId: postId.trim() || null };
}

export const CAMPUS_ACCOUNT_ROLE_LABEL: Record<CampusAccountSaveRole, string> = {
  college_admin: "College Admin",
  chairman_admin: "Chairman",
  gec_chairman: "GEC Chairman",
};
