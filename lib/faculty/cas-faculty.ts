/**
 * CAS faculty share one instructor list.
 *
 * CAS (College of Arts and Sciences) teaches across its own programs and the general subjects of
 * every college, so whoever plots for CAS — the CAS Admin, a Service Chair, or a CAS Program
 * Chairperson — is offered the same instructors: all of CAS's faculty (instructors, Program Chairs,
 * the CAS Admin) plus the General Subject instructors. Other colleges keep their department scoping.
 */

export const CAS_COLLEGE_CODE = "CAS";

/** The CAS college's id, from a list of colleges (null when there is no CAS college). */
export function casCollegeIdFrom(colleges: readonly { id: string; code?: string | null }[]): string | null {
  const cas = colleges.find((c) => (c.code ?? "").trim().toUpperCase() === CAS_COLLEGE_CODE);
  return cas?.id ?? null;
}

/** True when the college is CAS. */
export function isCasCollege(
  collegeId: string | null | undefined,
  colleges: readonly { id: string; code?: string | null }[],
): boolean {
  const id = (collegeId ?? "").trim();
  return Boolean(id) && id === casCollegeIdFrom(colleges);
}
