import { describe, expect, it } from "vitest";
import { insScopeLockedCollegeId } from "./ins-scope-lock";

const COTE = "col-tech-eng";

describe("insScopeLockedCollegeId", () => {
  /** The case reported: a COTE admin was offered "All colleges (campus-wide)". */
  it("pins a College Admin to their own college", () => {
    expect(
      insScopeLockedCollegeId({
        chairmanCollegeId: undefined,
        viewerCollegeId: COTE,
        campusWide: false,
        gecOnly: false,
      }),
    ).toBe(COTE);
  });

  it("leaves DOI and VPAA campus-wide", () => {
    expect(
      insScopeLockedCollegeId({
        chairmanCollegeId: undefined,
        viewerCollegeId: COTE,
        campusWide: true,
        gecOnly: false,
      }),
    ).toBeNull();
  });

  /** General education is taught in every college, so the GEC Chairman is not pinned to one. */
  it("leaves the GEC Chairman unpinned", () => {
    expect(
      insScopeLockedCollegeId({
        chairmanCollegeId: undefined,
        viewerCollegeId: COTE,
        campusWide: false,
        gecOnly: true,
      }),
    ).toBeNull();
  });

  /** A Program Chairman has their own picker variant, which already shows only their program. */
  it("leaves a Program Chairman to their own variant", () => {
    expect(
      insScopeLockedCollegeId({
        chairmanCollegeId: COTE,
        viewerCollegeId: null,
        campusWide: false,
        gecOnly: false,
      }),
    ).toBeNull();
  });

  it("pins nothing when the page gave no college", () => {
    expect(
      insScopeLockedCollegeId({
        chairmanCollegeId: undefined,
        viewerCollegeId: null,
        campusWide: false,
        gecOnly: false,
      }),
    ).toBeNull();
  });
});
