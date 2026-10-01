import { describe, expect, it } from "vitest";
import {
  assignmentForSaveRole,
  GEC_CHAIRMAN_POST_ID,
  isCampusSingletonRole,
  postIdForAccount,
  saveRoleForPost,
  tabForSaveRole,
} from "./campus-account-posts";

describe("saveRoleForPost", () => {
  it("saves a GEC Chairman when the GEC post is chosen in the Chairmen tab", () => {
    expect(saveRoleForPost("chairman_admin", GEC_CHAIRMAN_POST_ID)).toBe("gec_chairman");
  });

  it("saves an ordinary Chairman for a department", () => {
    expect(saveRoleForPost("chairman_admin", "prog-bsit")).toBe("chairman_admin");
  });

  it("never turns a College Admin into a GEC Chairman", () => {
    // The GEC post is only ever offered in the Chairmen tab.
    expect(saveRoleForPost("college_admin", GEC_CHAIRMAN_POST_ID)).toBe("college_admin");
    expect(saveRoleForPost("college_admin", "col-cas")).toBe("college_admin");
  });

  it("falls back to the tab when no post is chosen", () => {
    expect(saveRoleForPost("chairman_admin", "")).toBe("chairman_admin");
    expect(saveRoleForPost("chairman_admin", null)).toBe("chairman_admin");
  });
});

describe("isCampusSingletonRole", () => {
  /** The whole point of the request: there may be exactly one GEC Chairman. */
  it("is true only for the GEC Chairman", () => {
    expect(isCampusSingletonRole("gec_chairman")).toBe(true);
    expect(isCampusSingletonRole("chairman_admin")).toBe(false);
    expect(isCampusSingletonRole("college_admin")).toBe(false);
    expect(isCampusSingletonRole(null)).toBe(false);
  });
});

describe("postIdForAccount", () => {
  it("puts every GEC Chairman on the one GEC post", () => {
    expect(postIdForAccount({ role: "gec_chairman", collegeId: "col-tech-eng" })).toBe(
      GEC_CHAIRMAN_POST_ID,
    );
    // Campus-wide, so no college — still the same post.
    expect(postIdForAccount({ role: "gec_chairman", collegeId: null })).toBe(GEC_CHAIRMAN_POST_ID);
  });

  it("reads a College Admin's college and a Chairman's department", () => {
    expect(postIdForAccount({ role: "college_admin", collegeId: "col-cas" })).toBe("col-cas");
    expect(postIdForAccount({ role: "chairman_admin", chairmanProgramId: "prog-bsit" })).toBe(
      "prog-bsit",
    );
  });

  it("holds no post when the assignment column is empty", () => {
    // Must not come back as a match for every post.
    expect(postIdForAccount({ role: "college_admin", collegeId: null })).toBeNull();
    expect(postIdForAccount({ role: "chairman_admin", chairmanProgramId: "  " })).toBeNull();
    expect(postIdForAccount({ role: "instructor" })).toBeNull();
    expect(postIdForAccount({})).toBeNull();
  });
});

describe("tabForSaveRole", () => {
  it("lists the GEC Chairman with the Chairmen", () => {
    expect(tabForSaveRole("gec_chairman")).toBe("chairman_admin");
    expect(tabForSaveRole("chairman_admin")).toBe("chairman_admin");
    expect(tabForSaveRole("college_admin")).toBe("college_admin");
  });
});

describe("assignmentForSaveRole", () => {
  /**
   * A college would scope their INS pages to it, and migration 022 cleared it for exactly that
   * reason — the app reads a null college as campus-wide.
   */
  it("gives the GEC Chairman no college and no department", () => {
    expect(assignmentForSaveRole("gec_chairman", GEC_CHAIRMAN_POST_ID, "col-tech-eng")).toEqual({
      collegeId: null,
      programId: null,
    });
  });

  it("assigns a College Admin to the chosen college", () => {
    expect(assignmentForSaveRole("college_admin", "col-cas")).toEqual({
      collegeId: "col-cas",
      programId: null,
    });
  });

  it("assigns a Chairman to the department and its college", () => {
    expect(assignmentForSaveRole("chairman_admin", "prog-bsit", "col-tech-eng")).toEqual({
      collegeId: "col-tech-eng",
      programId: "prog-bsit",
    });
  });

  it("tolerates a department whose college is unset", () => {
    expect(assignmentForSaveRole("chairman_admin", "prog-bsit", null)).toEqual({
      collegeId: null,
      programId: "prog-bsit",
    });
  });
});
