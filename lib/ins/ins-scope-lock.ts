/**
 * Whether the INS Forms Generator pins its scope bar to one college.
 *
 * The forms' data was already limited to the viewer's college; only the picker disagreed, offering
 * "All colleges (campus-wide)" to a College Admin whose lists could never show another college.
 * This states the rule in one place so the three forms cannot drift apart on it.
 */
export function insScopeLockedCollegeId(args: {
  /** `undefined` when the page is not a Program Chairman's; they have their own picker variant. */
  chairmanCollegeId: string | null | undefined;
  /** The viewer's own college, passed by the page. */
  viewerCollegeId: string | null;
  /** DOI / VPAA: the forms genuinely cover every college. */
  campusWide: boolean;
  /** GEC Chairman: general education reaches into every college. */
  gecOnly: boolean;
}): string | null {
  if (args.chairmanCollegeId !== undefined) return null;
  if (args.campusWide || args.gecOnly) return null;
  return args.viewerCollegeId;
}
