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

/** Explicit college-list URL so Next.js does not keep `?college=` when clicking Colleges. */
export function hubCollegesListHref(basePath: string): string {
  const path = basePath.split("?")[0] || basePath;
  return `${path}?view=colleges`;
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
