import { describe, expect, it } from "vitest";
import {
  buildScopeOptions,
  findScopeOption,
  scopeOptionLabel,
  searchScopeOptions,
} from "./scope-search";

const COLLEGES = [
  { id: "col-tech-eng", code: "COTE", name: "College of Technology and Engineering" },
  { id: "col-cafe", code: "CAFE", name: "College of Agriculture, Forestry and Environment" },
];

const PROGRAMS = [
  { id: "prog-bsit", code: "BSIT", name: "BS Information Technology", collegeId: "col-tech-eng" },
  { id: "prog-bit-auto", code: "BIT-AUTO", name: "BIT Automotive Technology", collegeId: "col-tech-eng" },
  { id: "prog-envs", code: "BSENVS", name: "BS Environmental Science", collegeId: "col-cafe" },
];

const OPTIONS = buildScopeOptions(COLLEGES, PROGRAMS);

describe("buildScopeOptions", () => {
  it("offers every college and every department", () => {
    expect(OPTIONS.filter((o) => o.kind === "college")).toHaveLength(2);
    expect(OPTIONS.filter((o) => o.kind === "program")).toHaveLength(3);
  });

  it("carries the scope a pick should apply", () => {
    const bsit = OPTIONS.find((o) => o.code === "BSIT")!;
    expect(bsit).toMatchObject({ collegeId: "col-tech-eng", programId: "prog-bsit", parentLabel: "COTE" });

    const cote = OPTIONS.find((o) => o.key === "college:col-tech-eng")!;
    expect(cote).toMatchObject({ collegeId: "col-tech-eng", programId: null });
  });
});

describe("searchScopeOptions", () => {
  it("finds a department by its code", () => {
    expect(searchScopeOptions(OPTIONS, "bsit").map((o) => o.code)).toEqual(["BSIT"]);
  });

  it("finds a college by its code and by its name", () => {
    expect(searchScopeOptions(OPTIONS, "cote")[0]?.code).toBe("COTE");
    expect(searchScopeOptions(OPTIONS, "agriculture")[0]?.code).toBe("CAFE");
  });

  it("finds departments through their college", () => {
    const codes = searchScopeOptions(OPTIONS, "COTE").map((o) => o.code);
    expect(codes).toContain("COTE");
    expect(codes).toContain("BSIT");
    expect(codes).toContain("BIT-AUTO");
    expect(codes).not.toContain("BSENVS");
  });

  it("puts an exact code first", () => {
    expect(searchScopeOptions(OPTIONS, "BSIT")[0]?.code).toBe("BSIT");
  });

  it("matches part of a name", () => {
    expect(searchScopeOptions(OPTIONS, "information").map((o) => o.code)).toEqual(["BSIT"]);
  });

  it("returns the head of the list for an empty query", () => {
    expect(searchScopeOptions(OPTIONS, "  ", 3)).toHaveLength(3);
  });

  it("is empty when nothing matches", () => {
    expect(searchScopeOptions(OPTIONS, "zzz")).toEqual([]);
  });

  it("honours the limit", () => {
    expect(searchScopeOptions(OPTIONS, "", 2)).toHaveLength(2);
  });
});

describe("findScopeOption", () => {
  it("resolves a department scope", () => {
    expect(findScopeOption(OPTIONS, { collegeId: "col-tech-eng", programId: "prog-bsit" })?.code).toBe("BSIT");
  });

  it("resolves a college-wide scope", () => {
    const hit = findScopeOption(OPTIONS, { collegeId: "col-cafe", programId: null });
    expect(hit).toMatchObject({ kind: "college", code: "CAFE" });
  });

  it("is null for campus-wide", () => {
    expect(findScopeOption(OPTIONS, { collegeId: null, programId: null })).toBeNull();
  });
});

describe("scopeOptionLabel", () => {
  it("names the department and its college", () => {
    const bsit = OPTIONS.find((o) => o.code === "BSIT")!;
    expect(scopeOptionLabel(bsit)).toBe("BSIT — BS Information Technology (COTE)");
  });

  it("names a college on its own", () => {
    const cote = OPTIONS.find((o) => o.key === "college:col-tech-eng")!;
    expect(scopeOptionLabel(cote)).toBe("COTE — College of Technology and Engineering");
    expect(scopeOptionLabel(null)).toBe("");
  });
});
