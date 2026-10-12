import { describe, expect, it } from "vitest";
import {
  CAS_ADMIN_NAV,
  CHAIRMAN_NAV,
  COLLEGE_ADMIN_NAV,
  DOI_ADMIN_NAV,
  GEC_CHAIRMAN_NAV,
  LOADING_POLICY_NAV_LABEL,
  LOAD_GENERATOR_NAV_LABEL,
  SUBJECT_LOAD_GROUP_LABEL,
  SUBJECT_SCHEDULER_NAV_LABEL,
  isNavGroup,
  navEntryHrefs,
  type AdminNavEntry,
} from "./admin-nav";

const ROLE_NAVS: Array<[string, readonly AdminNavEntry[]]> = [
  ["Chairman", CHAIRMAN_NAV],
  ["College Admin", COLLEGE_ADMIN_NAV],
  ["CAS Admin", CAS_ADMIN_NAV],
  ["GEC Chairman", GEC_CHAIRMAN_NAV],
  ["DOI", DOI_ADMIN_NAV],
];

const groupOf = (entries: readonly AdminNavEntry[]) =>
  entries.find((e) => isNavGroup(e) && e.label === SUBJECT_LOAD_GROUP_LABEL);

describe("Subject Load Management group", () => {
  it.each(ROLE_NAVS)("%s has the group", (_role, nav) => {
    const group = groupOf(nav);
    expect(group).toBeDefined();
    expect(isNavGroup(group!)).toBe(true);
  });

  it.each(ROLE_NAVS)("%s puts the scheduler and the form generator inside it", (_role, nav) => {
    const group = groupOf(nav);
    const labels = isNavGroup(group!) ? group!.items.map((i) => i.label) : [];
    expect(labels).toContain(SUBJECT_SCHEDULER_NAV_LABEL);
    expect(labels).toContain(LOAD_GENERATOR_NAV_LABEL);
  });

  /** Those four pages are one workflow; none of them should also sit loose in the list. */
  it.each(ROLE_NAVS)("%s leaves no grouped page at the top level", (_role, nav) => {
    const grouped = new Set(
      nav.flatMap((e) => (isNavGroup(e) ? e.items.map((i) => i.label) : [])),
    );
    const topLevel = nav.filter((e) => !isNavGroup(e)).map((e) => e.label);
    for (const label of topLevel) expect(grouped.has(label)).toBe(false);
  });

  it("gives College Admin all four pages", () => {
    const group = groupOf(COLLEGE_ADMIN_NAV);
    const labels = isNavGroup(group!) ? group!.items.map((i) => i.label) : [];
    expect(labels).toEqual([
      SUBJECT_SCHEDULER_NAV_LABEL,
      LOAD_GENERATOR_NAV_LABEL,
      "Summary of Teaching Load",
      LOADING_POLICY_NAV_LABEL,
    ]);
  });

  it("gives DOI the loading policy queue", () => {
    const group = groupOf(DOI_ADMIN_NAV);
    const items = isNavGroup(group!) ? group!.items : [];
    expect(items.find((i) => i.label === LOADING_POLICY_NAV_LABEL)?.href).toBe("/doi/reviews");
  });

  it("keeps the DOI hub flag on the scheduler link", () => {
    // Without `?hub=1` the link opens the campus-wide plotter instead of the college choice.
    const group = groupOf(DOI_ADMIN_NAV);
    const items = isNavGroup(group!) ? group!.items : [];
    expect(items.find((i) => i.label === SUBJECT_SCHEDULER_NAV_LABEL)?.href).toBe(
      "/doi/evaluator?hub=1",
    );
  });
});

describe("navEntryHrefs", () => {
  it("answers for a group's children, so active matching still works", () => {
    const hrefs = navEntryHrefs(COLLEGE_ADMIN_NAV);
    expect(hrefs).toContain("/admin/college/evaluator");
    expect(hrefs).toContain("/admin/college/teaching-load-summary");
    expect(hrefs).toContain("/admin/college");
  });

  it.each(ROLE_NAVS)("%s has no duplicate destinations", (_role, nav) => {
    const hrefs = navEntryHrefs(nav);
    expect(new Set(hrefs).size).toBe(hrefs.length);
  });
});

describe("renamed labels", () => {
  it("uses the names people asked for", () => {
    expect(SUBJECT_SCHEDULER_NAV_LABEL).toBe("Subject Scheduler");
    expect(LOAD_GENERATOR_NAV_LABEL).toBe("INS Forms Generator");
    expect(LOADING_POLICY_NAV_LABEL).toBe("Loading Policy");
    expect(SUBJECT_LOAD_GROUP_LABEL).toBe("Subject Load Management");
  });

  it.each(ROLE_NAVS)("%s no longer shows the old names", (_role, nav) => {
    const labels = nav.flatMap((e) => (isNavGroup(e) ? [e.label, ...e.items.map((i) => i.label)] : [e.label]));
    expect(labels).not.toContain("Evaluator");
    expect(labels).not.toContain("Load Generator");
    expect(labels).not.toContain("Load justifications");
  });
});
