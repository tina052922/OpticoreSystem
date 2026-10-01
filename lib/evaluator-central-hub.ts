/** CTU Argao Central Hub — college tiles driven by live `College` rows (with stable hub slugs when known). */

export type HubCollege = {
  slug: string;
  abbr: string;
  name: string;
  collegeId: string | null;
};

export type HubCollegeCatalogRow = {
  id: string;
  code: string;
  name: string;
};

/**
 * Seed-order hints for known Argao colleges. `collegeId` / `abbr` match seeded rows when present;
 * live DB name/code always win when a row is found.
 */
export const CENTRAL_HUB_COLLEGES: HubCollege[] = [
  {
    slug: "cote",
    abbr: "COTE",
    name: "College of Technology and Engineering",
    collegeId: "col-tech-eng",
  },
  {
    slug: "cas",
    abbr: "CAS",
    name: "College of Arts And Sciences",
    collegeId: null,
  },
  {
    slug: "coed",
    abbr: "COED",
    name: "College of Education",
    collegeId: null,
  },
  {
    slug: "cafe",
    abbr: "CAFE",
    name: "College of Agriculture, Forestry, & Environmental Science",
    collegeId: "col-cafe",
  },
  {
    slug: "chmt",
    abbr: "CHMT",
    name: "College of Hospitality Management & Tourism",
    collegeId: null,
  },
];

/** Query value for campus-wide timetable (all colleges in DB). */
export const CAMPUS_WIDE_COLLEGE_SLUG = "all";

function matchHintToDb(h: HubCollege, db: HubCollegeCatalogRow[]): HubCollegeCatalogRow | undefined {
  if (h.collegeId) {
    const byId = db.find((c) => c.id === h.collegeId);
    if (byId) return byId;
  }
  const abbr = h.abbr.trim().toUpperCase();
  const slug = h.slug.trim().toUpperCase();
  return db.find((c) => {
    const code = c.code.trim().toUpperCase();
    return code === abbr || code === slug;
  });
}

/**
 * Evaluator Colleges tab tiles: live catalog is the source of truth.
 * - Known hub colleges keep stable slugs (`cote`, `cas`, …) when matched.
 * - Renames use the DB name.
 * - Newly added colleges appear with slug = college id.
 */
export function hubCollegesFromDb(dbColleges: HubCollegeCatalogRow[]): HubCollege[] {
  const used = new Set<string>();
  const tiles: HubCollege[] = [];

  for (const h of CENTRAL_HUB_COLLEGES) {
    const live = matchHintToDb(h, dbColleges);
    if (!live) continue;
    used.add(live.id);
    tiles.push({
      slug: h.slug,
      abbr: live.code.trim() || h.abbr,
      name: live.name.trim() || h.name,
      collegeId: live.id,
    });
  }

  for (const c of dbColleges) {
    if (used.has(c.id)) continue;
    const code = c.code.trim() || c.id;
    tiles.push({
      slug: c.id,
      abbr: code,
      name: c.name.trim() || code,
      collegeId: c.id,
    });
  }

  return tiles;
}

/** Resolve `?college=` (hub slug, college id, or code) against the live catalog. */
export function resolveHubCollege(
  collegeParam: string | null | undefined,
  dbColleges: HubCollegeCatalogRow[],
): HubCollege | undefined {
  if (!collegeParam) return undefined;
  const s = collegeParam.trim();
  if (!s || s.toLowerCase() === CAMPUS_WIDE_COLLEGE_SLUG) return undefined;

  const tiles = hubCollegesFromDb(dbColleges);
  const lower = s.toLowerCase();
  const fromTiles = tiles.find(
    (t) =>
      t.slug.toLowerCase() === lower ||
      (t.collegeId && t.collegeId === s) ||
      t.abbr.toLowerCase() === lower,
  );
  if (fromTiles) return fromTiles;

  const live = dbColleges.find(
    (c) => c.id === s || c.code.trim().toLowerCase() === lower,
  );
  if (!live) return undefined;
  return {
    slug: live.id,
    abbr: live.code.trim() || live.id,
    name: live.name.trim() || live.code,
    collegeId: live.id,
  };
}

/** @deprecated Prefer {@link resolveHubCollege} with the live college catalog. */
export function hubCollegeBySlug(slug: string | null): HubCollege | undefined {
  if (!slug) return undefined;
  const s = slug.toLowerCase();
  if (s === CAMPUS_WIDE_COLLEGE_SLUG) return undefined;
  return CENTRAL_HUB_COLLEGES.find((c) => c.slug === s);
}

export function hubSlugForCollegeId(collegeId: string): string | undefined {
  return CENTRAL_HUB_COLLEGES.find((c) => c.collegeId === collegeId)?.slug;
}

/** Query params the hub itself owns, so a stale one on the base path never fights the new one. */
const HUB_OWNED_PARAMS = ["college", "view", "panel"] as const;

/**
 * A hub URL that keeps whatever query the base path already carries.
 *
 * DOI reaches the hub through `?hub=1` on its own evaluator route, so that flag is part of their base
 * path. Interpolating `${basePath}?college=…` dropped it, which sent every tile click out of the hub
 * and into the campus-wide plotter — and there `?college=` means nothing, so clicking one college
 * showed the programs of all of them.
 *
 * Pass raw values; they are encoded here.
 */
export function hubHref(
  basePath: string,
  params: Record<string, string | null | undefined>,
): string {
  const [path, existing = ""] = basePath.split("?");
  const query = new URLSearchParams(existing);
  for (const key of HUB_OWNED_PARAMS) query.delete(key);
  for (const [key, value] of Object.entries(params)) {
    if (value === null || value === undefined || value === "") continue;
    query.set(key, value);
  }
  const search = query.toString();
  return search ? `${path || basePath}?${search}` : path || basePath;
}

/** Explicit college-list URL so Next.js does not keep `?college=` when clicking Colleges. */
export function hubCollegesListHref(basePath: string): string {
  return hubHref(basePath, { view: "colleges" });
}

export function isHubCollegeListView(view: string | null, college: string | null): boolean {
  if ((view ?? "").trim().toLowerCase() === "colleges") return true;
  return !college?.trim();
}

/**
 * GEC / hub landing tiles from live colleges (renames + new colleges included).
 * Falls back to hardcoded hub labels only when the catalog has not loaded yet.
 */
export function gecHubCollegeTiles(
  dbColleges: Array<{ id: string; name: string; code?: string }>,
): Array<{ id: string; name: string }> {
  if (dbColleges.length === 0) {
    return CENTRAL_HUB_COLLEGES.map((h) => ({
      id: h.collegeId ?? h.slug,
      name: h.name,
    }));
  }
  return hubCollegesFromDb(
    dbColleges.map((c) => ({
      id: c.id,
      code: c.code ?? c.id,
      name: c.name,
    })),
  ).map((h) => ({
    id: h.collegeId ?? h.slug,
    name: h.name,
  }));
}

/**
 * What the hub is scoped to right now.
 *
 * The view used to carry this as a single `collegeId | null`, where null meant BOTH "campus-wide,
 * show everything" and "that college did not resolve". Those are opposite intentions, and the
 * program list read null as campus-wide — so opening a college before its catalog had loaded, or
 * with a slug that matched nothing, silently listed every program on campus. Clicking CAS and
 * seeing COTE's programs is that bug.
 *
 * Four states, so a failure can never be mistaken for permission to show everything.
 */
export type HubScope =
  | { kind: "none" }
  | { kind: "campusWide" }
  | { kind: "college"; collegeId: string }
  | { kind: "unresolved"; slug: string };

export function resolveHubScope(
  collegeSlug: string | null | undefined,
  dbColleges: HubCollegeCatalogRow[],
): HubScope {
  const slug = (collegeSlug ?? "").trim();
  if (!slug) return { kind: "none" };
  if (slug.toLowerCase() === CAMPUS_WIDE_COLLEGE_SLUG) return { kind: "campusWide" };

  const hit = resolveHubCollege(slug, dbColleges);
  if (hit?.collegeId) return { kind: "college", collegeId: hit.collegeId };
  // Catalog still loading, or a slug that matches nothing. Either way: not everything.
  return { kind: "unresolved", slug };
}

/**
 * Rows for the current scope.
 *
 * `unresolved` yields nothing on purpose — showing another college's data is worse than showing an
 * empty list while the catalog arrives.
 */
export function rowsForHubScope<T extends { collegeId?: string | null }>(
  rows: readonly T[],
  scope: HubScope,
): T[] {
  if (scope.kind === "campusWide") return [...rows];
  if (scope.kind === "college") return rows.filter((r) => r.collegeId === scope.collegeId);
  return [];
}
