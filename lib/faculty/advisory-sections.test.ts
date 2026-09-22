import { describe, expect, it } from "vitest";
import {
  advisesSection,
  advisoryLabel,
  advisorySectionIdsOf,
  advisoryWriteFields,
} from "./advisory-sections";

describe("advisorySectionIdsOf", () => {
  it("returns every section a faculty advises", () => {
    expect(advisorySectionIdsOf({ advisorySectionIds: ["s1", "s2"], advisorySectionId: "s1" })).toEqual([
      "s1",
      "s2",
    ]);
  });

  it("falls back to the legacy single column", () => {
    expect(advisorySectionIdsOf({ advisorySectionId: "s9" })).toEqual(["s9"]);
    expect(advisorySectionIdsOf({ advisorySectionIds: null, advisorySectionId: "s9" })).toEqual(["s9"]);
  });

  it("keeps a legacy value the array is missing", () => {
    expect(advisorySectionIdsOf({ advisorySectionIds: ["s1"], advisorySectionId: "s3" })).toEqual([
      "s1",
      "s3",
    ]);
  });

  it("is empty for no advisory", () => {
    expect(advisorySectionIdsOf({ advisorySectionIds: [], advisorySectionId: null })).toEqual([]);
    expect(advisorySectionIdsOf(null)).toEqual([]);
  });
});

describe("advisoryWriteFields", () => {
  it("keeps the legacy column pointing at the first section", () => {
    expect(advisoryWriteFields(["s2", "s1"])).toEqual({
      advisorySectionIds: ["s2", "s1"],
      advisorySectionId: "s2",
    });
  });

  it("drops blanks and duplicates", () => {
    expect(advisoryWriteFields([" s1 ", "s1", "", "s2"])).toEqual({
      advisorySectionIds: ["s1", "s2"],
      advisorySectionId: "s1",
    });
  });

  it("clears both columns when nothing is selected", () => {
    expect(advisoryWriteFields([])).toEqual({ advisorySectionIds: [], advisorySectionId: null });
  });
});

describe("advisesSection", () => {
  const profile = { advisorySectionIds: ["s1", "s2"], advisorySectionId: "s1" };

  it("matches any of the advised sections", () => {
    expect(advisesSection(profile, "s2")).toBe(true);
    expect(advisesSection(profile, "s3")).toBe(false);
    expect(advisesSection(profile, "")).toBe(false);
  });
});

describe("advisoryLabel", () => {
  const names = new Map([
    ["s1", "BSIT 1-A"],
    ["s2", "BSIT 2-B"],
  ]);

  it("joins the section names", () => {
    expect(advisoryLabel({ advisorySectionIds: ["s1", "s2"] }, names)).toBe("BSIT 1-A, BSIT 2-B");
  });

  it("falls back when there is no advisory", () => {
    expect(advisoryLabel({ advisorySectionIds: [] }, names)).toBe("—");
    expect(advisoryLabel(null, names, "None")).toBe("None");
  });
});
