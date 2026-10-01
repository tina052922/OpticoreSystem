import { describe, expect, it } from "vitest";
import {
  facultyScopeCollegeParam,
  facultyScopeShouldLoad,
  facultyScopeWriteCollegeId,
  resolveFacultyCollegeScope,
} from "./faculty-college-scope";

describe("resolveFacultyCollegeScope", () => {
  /**
   * The bug this exists for. DOI's Faculty Profile opens on "All colleges (campus-wide)", which is a
   * null college — and the loader read null as "no scope yet" and fetched nothing, so the page sat
   * empty on its own default filter.
   */
  it("is campus-wide for a campus page with no college chosen", () => {
    expect(resolveFacultyCollegeScope({ allowCampusWide: true })).toEqual({ kind: "campusWide" });
    expect(resolveFacultyCollegeScope({ scopeCollegeId: null, allowCampusWide: true })).toEqual({
      kind: "campusWide",
    });
  });

  /**
   * The other half. A College Admin's session can resolve a tick after the first render, and in that
   * tick the college is null — which must not mean "show me every college".
   */
  it("is 'none', never campus-wide, for a college-bound viewer with no college yet", () => {
    expect(resolveFacultyCollegeScope({})).toEqual({ kind: "none" });
    expect(resolveFacultyCollegeScope({ chairmanCollegeId: null })).toEqual({ kind: "none" });
    expect(resolveFacultyCollegeScope({ allowCampusWide: false })).toEqual({ kind: "none" });
  });

  it("keeps the chairman → viewer → scope precedence", () => {
    expect(
      resolveFacultyCollegeScope({
        chairmanCollegeId: "col-tech-eng",
        viewerCollegeId: "col-cas",
        scopeCollegeId: "col-cafe",
      }),
    ).toEqual({ kind: "college", collegeId: "col-tech-eng" });

    expect(
      resolveFacultyCollegeScope({ viewerCollegeId: "col-cas", scopeCollegeId: "col-cafe" }),
    ).toEqual({ kind: "college", collegeId: "col-cas" });

    expect(resolveFacultyCollegeScope({ scopeCollegeId: "col-cafe" })).toEqual({
      kind: "college",
      collegeId: "col-cafe",
    });
  });

  it("lets a chosen college win over campus-wide", () => {
    // Picking CAS on the DOI page scopes to CAS; it does not stay campus-wide.
    expect(resolveFacultyCollegeScope({ scopeCollegeId: "col-cas", allowCampusWide: true })).toEqual({
      kind: "college",
      collegeId: "col-cas",
    });
  });

  it("treats a blank or whitespace college as unset", () => {
    expect(resolveFacultyCollegeScope({ chairmanCollegeId: "   ", allowCampusWide: true })).toEqual({
      kind: "campusWide",
    });
    expect(resolveFacultyCollegeScope({ scopeCollegeId: "" })).toEqual({ kind: "none" });
    expect(resolveFacultyCollegeScope({ scopeCollegeId: "  col-cas  " })).toEqual({
      kind: "college",
      collegeId: "col-cas",
    });
  });

  it("falls through a blank value to the next source", () => {
    expect(
      resolveFacultyCollegeScope({ chairmanCollegeId: "  ", scopeCollegeId: "col-cas" }),
    ).toEqual({ kind: "college", collegeId: "col-cas" });
  });
});

describe("facultyScopeCollegeParam", () => {
  it("omits the filter campus-wide so the route returns every college", () => {
    expect(facultyScopeCollegeParam({ kind: "campusWide" })).toBeNull();
  });

  it("sends the college id when one is in scope", () => {
    expect(facultyScopeCollegeParam({ kind: "college", collegeId: "col-cas" })).toBe("col-cas");
  });

  it("omits the filter with no scope, where nothing should be fetched at all", () => {
    expect(facultyScopeCollegeParam({ kind: "none" })).toBeNull();
  });
});

describe("facultyScopeShouldLoad", () => {
  it("loads campus-wide and for one college", () => {
    expect(facultyScopeShouldLoad({ kind: "campusWide" })).toBe(true);
    expect(facultyScopeShouldLoad({ kind: "college", collegeId: "col-cas" })).toBe(true);
  });

  it("does not load with no scope", () => {
    // This is what keeps an unresolved college-bound session from fetching everything.
    expect(facultyScopeShouldLoad({ kind: "none" })).toBe(false);
  });
});

describe("facultyScopeWriteCollegeId", () => {
  it("gives the college a new faculty would be created under", () => {
    expect(facultyScopeWriteCollegeId({ kind: "college", collegeId: "col-cas" })).toBe("col-cas");
  });

  it("gives none campus-wide, because a new row needs exactly one college", () => {
    expect(facultyScopeWriteCollegeId({ kind: "campusWide" })).toBeNull();
    expect(facultyScopeWriteCollegeId({ kind: "none" })).toBeNull();
  });
});
