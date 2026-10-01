/**
 * Which colleges a Faculty Profile page may list.
 *
 * The workspace used to carry one `collegeId | null`, where null meant two different things:
 * "campus-wide, list everyone" for DOI, and "no college in scope yet" for a college-bound role whose
 * session had not resolved. The loaders read null as the second, so DOI's own page — which defaults
 * to "All colleges (campus-wide)" — fetched nothing and showed an empty table.
 *
 * Splitting the two apart is what makes campus-wide safe: it is only ever reached when the caller
 * says the viewer is entitled to it, so a college-bound role that is still loading gets `none` (an
 * empty list) rather than every faculty on campus.
 */
export type FacultyCollegeScope =
  /** No college resolved and the viewer is not campus-wide: list nothing. */
  | { kind: "none" }
  /** Every college. Only for viewers whose caller passed `allowCampusWide`. */
  | { kind: "campusWide" }
  | { kind: "college"; collegeId: string };

export type FacultyCollegeScopeInput = {
  /** Chairman / GEC: the college their session is bound to. */
  chairmanCollegeId?: string | null;
  /** Page-level viewer college, where the route supplies one. */
  viewerCollegeId?: string | null;
  /** The Search & scope bar's current college; null is its "All colleges" option. */
  scopeCollegeId?: string | null;
  /**
   * Whether an unset college means "all colleges" for this viewer.
   *
   * True only for campus-wide pages (DOI, CAS). A College Admin page pins its own college and must
   * never widen, so it leaves this false even though it uses the same scope bar.
   */
  allowCampusWide?: boolean;
};

/** Same precedence the workspace has always used: chairman → viewer → scope bar. */
export function resolveFacultyCollegeScope(input: FacultyCollegeScopeInput): FacultyCollegeScope {
  const explicit = [input.chairmanCollegeId, input.viewerCollegeId, input.scopeCollegeId]
    .map((v) => (v ?? "").trim())
    .find((v) => v !== "");

  if (explicit) return { kind: "college", collegeId: explicit };
  return input.allowCampusWide ? { kind: "campusWide" } : { kind: "none" };
}

/**
 * The `collegeId` to send to a catalog route, or null to omit the filter.
 *
 * `/api/catalog/users` and `/api/catalog/programs` both return every row when `collegeId` is absent,
 * which is exactly what campus-wide wants.
 */
export function facultyScopeCollegeParam(scope: FacultyCollegeScope): string | null {
  return scope.kind === "college" ? scope.collegeId : null;
}

/** Whether a fetch should run at all. `none` has nothing to ask for. */
export function facultyScopeShouldLoad(scope: FacultyCollegeScope): boolean {
  return scope.kind !== "none";
}

/**
 * The college a new faculty would be created under, or null when there is no single one.
 *
 * Campus-wide can list across colleges but cannot create, because a new row has to land in exactly
 * one college — so the form stays disabled until a college is picked.
 */
export function facultyScopeWriteCollegeId(scope: FacultyCollegeScope): string | null {
  return scope.kind === "college" ? scope.collegeId : null;
}
