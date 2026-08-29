/** CTU Argao Central Hub — college tiles; `collegeId` links to `public."College".id` when seeded. */
export type HubCollege = {
  slug: string;
  abbr: string;
  name: string;
  collegeId: string | null;
};

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
    /** Matches `supabase/seed.sql` — `public."College".id` for BS Environmental Science / CAFE. */
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

/** GEC landing tiles: always show hub colleges, then any extra DB colleges. */
export function gecHubCollegeTiles(
  dbColleges: Array<{ id: string; name: string }>,
): Array<{ id: string; name: string }> {
  const leftover = new Map(dbColleges.map((c) => [c.id, c]));
  const tiles: Array<{ id: string; name: string }> = [];
  for (const h of CENTRAL_HUB_COLLEGES) {
    if (h.collegeId && leftover.has(h.collegeId)) {
      const row = leftover.get(h.collegeId)!;
      tiles.push({ id: row.id, name: row.name });
      leftover.delete(h.collegeId);
    } else {
      tiles.push({ id: h.collegeId ?? h.slug, name: h.name });
    }
  }
  for (const extra of leftover.values()) {
    tiles.push({ id: extra.id, name: extra.name });
  }
  return tiles;
}
