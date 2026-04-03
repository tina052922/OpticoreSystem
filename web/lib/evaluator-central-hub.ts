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
    collegeId: null,
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
