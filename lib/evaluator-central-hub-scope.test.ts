import { describe, expect, it } from "vitest";
import {
  CAMPUS_WIDE_COLLEGE_SLUG,
  resolveHubScope,
  rowsForHubScope,
  type HubScope,
} from "./evaluator-central-hub";

/** The campus as it really is: CAS exists and has far fewer programs than COTE. */
const colleges = [
  { id: "col-cafe", code: "CAFE", name: "College of Agriculture, Forestry, & Environmental Science" },
  { id: "col-cas", code: "CAS", name: "College of Arts and Sciences" },
  { id: "col-tech-eng", code: "COTE", name: "College of Technology and Engineering" },
  { id: "col-noc", code: "NOC", name: "New College" },
];

const programs = [
  { id: "prog-bsit", code: "BSIT", collegeId: "col-tech-eng" },
  { id: "prog-bsie", code: "BSIE", collegeId: "col-tech-eng" },
  { id: "prog-bit-auto", code: "BIT-AUTO", collegeId: "col-tech-eng" },
  { id: "prog-bsenvs", code: "BSENVS", collegeId: "col-cafe" },
  { id: "prog-bacomm", code: "BACOMM", collegeId: "col-cas" },
];

describe("resolveHubScope", () => {
  it("is 'none' on the college list, where nothing is chosen yet", () => {
    expect(resolveHubScope(null, colleges)).toEqual({ kind: "none" });
    expect(resolveHubScope("", colleges)).toEqual({ kind: "none" });
    expect(resolveHubScope("   ", colleges)).toEqual({ kind: "none" });
  });

  it("is 'campusWide' only for the all-colleges tile", () => {
    expect(resolveHubScope(CAMPUS_WIDE_COLLEGE_SLUG, colleges)).toEqual({ kind: "campusWide" });
    expect(resolveHubScope(CAMPUS_WIDE_COLLEGE_SLUG.toUpperCase(), colleges)).toEqual({
      kind: "campusWide",
    });
  });

  it("resolves a college by slug, id or code", () => {
    expect(resolveHubScope("cas", colleges)).toEqual({ kind: "college", collegeId: "col-cas" });
    expect(resolveHubScope("col-cas", colleges)).toEqual({ kind: "college", collegeId: "col-cas" });
    expect(resolveHubScope("CAS", colleges)).toEqual({ kind: "college", collegeId: "col-cas" });
    expect(resolveHubScope("cote", colleges)).toEqual({ kind: "college", collegeId: "col-tech-eng" });
  });

  /**
   * The bug this exists for. The view carried one `collegeId | null`, and null meant both
   * "campus-wide" and "did not resolve" — so a college opened before its catalog had loaded listed
   * every program on campus.
   */
  it("is 'unresolved', never campus-wide, when the catalog has not loaded", () => {
    expect(resolveHubScope("cas", [])).toEqual({ kind: "unresolved", slug: "cas" });
  });

  it("is 'unresolved' for a slug that matches no college", () => {
    expect(resolveHubScope("not-a-college", colleges)).toEqual({
      kind: "unresolved",
      slug: "not-a-college",
    });
  });
});

describe("rowsForHubScope", () => {
  it("gives one college only its own rows", () => {
    const scope = resolveHubScope("cas", colleges);
    expect(rowsForHubScope(programs, scope).map((p) => p.code)).toEqual(["BACOMM"]);
  });

  it("does not leak another college's rows", () => {
    const cas = rowsForHubScope(programs, resolveHubScope("cas", colleges)).map((p) => p.code);
    // The exact symptom: COTE's programs appearing under CAS.
    expect(cas).not.toContain("BSIT");
    expect(cas).not.toContain("BSIE");
    expect(cas).not.toContain("BIT-AUTO");
  });

  it("gives every row campus-wide", () => {
    const scope = resolveHubScope(CAMPUS_WIDE_COLLEGE_SLUG, colleges);
    expect(rowsForHubScope(programs, scope)).toHaveLength(programs.length);
  });

  it("gives nothing while a college is unresolved", () => {
    // An empty list for a moment is better than another college's data.
    expect(rowsForHubScope(programs, resolveHubScope("cas", []))).toEqual([]);
    expect(rowsForHubScope(programs, { kind: "unresolved", slug: "x" } as HubScope)).toEqual([]);
  });

  it("gives nothing before a college is chosen", () => {
    expect(rowsForHubScope(programs, { kind: "none" })).toEqual([]);
  });

  it("returns a copy campus-wide rather than the original array", () => {
    const scope: HubScope = { kind: "campusWide" };
    expect(rowsForHubScope(programs, scope)).not.toBe(programs);
  });

  it("treats a row with no college as belonging to no college", () => {
    const orphan = [...programs, { id: "x", code: "ORPHAN", collegeId: null }];
    expect(rowsForHubScope(orphan, resolveHubScope("cas", colleges)).map((p) => p.code)).toEqual([
      "BACOMM",
    ]);
  });
});
