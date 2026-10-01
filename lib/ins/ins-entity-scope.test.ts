import { describe, expect, it } from "vitest";
import { filterInsEntriesForScope, isGecEntry } from "./ins-entity-scope";

const sectionById = new Map([
  ["sec-bsit-1a", { programId: "prog-bsit" }],
  ["sec-auto-1a", { programId: "prog-bit-auto" }],
  ["sec-bacomm-1a", { programId: "prog-bacomm" }],
]);
const programById = new Map([
  ["prog-bsit", { collegeId: "col-tech-eng" }],
  ["prog-bit-auto", { collegeId: "col-tech-eng" }],
  ["prog-bacomm", { collegeId: "col-cas" }],
]);
const subjectById = new Map([
  ["sub-gec", { code: "GEC-1" }],
  ["sub-gee", { code: "GEE-3" }],
  ["sub-major", { code: "IT-211" }],
]);
const lookups = { sectionById, programById, subjectById };

const entries = [
  { id: "e-bsit-major", sectionId: "sec-bsit-1a", subjectId: "sub-major" },
  { id: "e-bsit-gec", sectionId: "sec-bsit-1a", subjectId: "sub-gec" },
  { id: "e-auto-major", sectionId: "sec-auto-1a", subjectId: "sub-major" },
  { id: "e-cas-gee", sectionId: "sec-bacomm-1a", subjectId: "sub-gee" },
  { id: "e-orphan", sectionId: "sec-gone", subjectId: "sub-major" },
];

const ids = (rows: { id: string }[]) => rows.map((r) => r.id);

describe("filterInsEntriesForScope — DOI", () => {
  it("gives every college", () => {
    const out = filterInsEntriesForScope(entries, { campusWide: true }, lookups);
    expect(ids(out)).toEqual(["e-bsit-major", "e-bsit-gec", "e-auto-major", "e-cas-gee"]);
  });

  it("drops a row whose section no longer exists", () => {
    expect(ids(filterInsEntriesForScope(entries, { campusWide: true }, lookups))).not.toContain("e-orphan");
  });
});

describe("filterInsEntriesForScope — College Admin", () => {
  /**
   * The gap this exists for. Section and Room pickers were built from unscoped rows, so a College
   * Admin's Room list held rooms from colleges they have nothing to do with.
   */
  it("gives only their own college", () => {
    const out = filterInsEntriesForScope(entries, { collegeId: "col-tech-eng" }, lookups);
    expect(ids(out)).toEqual(["e-bsit-major", "e-bsit-gec", "e-auto-major"]);
    expect(ids(out)).not.toContain("e-cas-gee");
  });
});

describe("filterInsEntriesForScope — Chairman", () => {
  it("narrows to their department within the college", () => {
    const out = filterInsEntriesForScope(
      entries,
      { collegeId: "col-tech-eng", programId: "prog-bsit" },
      lookups,
    );
    expect(ids(out)).toEqual(["e-bsit-major", "e-bsit-gec"]);
    expect(ids(out)).not.toContain("e-auto-major");
  });
});

describe("filterInsEntriesForScope — GEC Chairman", () => {
  it("gives general education from every college, and nothing else", () => {
    const out = filterInsEntriesForScope(entries, { gecOnly: true, campusWide: true }, lookups);
    expect(ids(out)).toEqual(["e-bsit-gec", "e-cas-gee"]);
    expect(ids(out)).not.toContain("e-bsit-major");
    expect(ids(out)).not.toContain("e-auto-major");
  });

  it("is not narrowed by a college, since general education crosses them", () => {
    const out = filterInsEntriesForScope(entries, { gecOnly: true, collegeId: "col-tech-eng" }, lookups);
    expect(ids(out)).toEqual(["e-bsit-gec", "e-cas-gee"]);
  });

  it("shows nothing when subjects have not loaded, rather than everything", () => {
    const out = filterInsEntriesForScope(entries, { gecOnly: true }, { sectionById, programById });
    expect(out).toEqual([]);
  });
});

describe("isGecEntry", () => {
  it("recognises GEC and GEE codes only", () => {
    expect(isGecEntry({ sectionId: "s", subjectId: "sub-gec" }, subjectById)).toBe(true);
    expect(isGecEntry({ sectionId: "s", subjectId: "sub-gee" }, subjectById)).toBe(true);
    expect(isGecEntry({ sectionId: "s", subjectId: "sub-major" }, subjectById)).toBe(false);
    expect(isGecEntry({ sectionId: "s", subjectId: null }, subjectById)).toBe(false);
  });
});
