import { describe, expect, it } from "vitest";
import {
  advisorySummaryLabel,
  facultyRowIsDirty,
  sameSectionIds,
  type FacultyRowDraft,
} from "./faculty-row-edits";

const base: FacultyRowDraft = {
  status: "Resident",
  designation: "Regular Faculty",
  advisorySectionIds: ["sec-1", "sec-2"],
};
const draft = (over: Partial<FacultyRowDraft> = {}): FacultyRowDraft => ({ ...base, ...over });

describe("sameSectionIds", () => {
  it("is a set comparison, so order does not count as a change", () => {
    expect(sameSectionIds(["a", "b"], ["b", "a"])).toBe(true);
    expect(sameSectionIds([], [])).toBe(true);
  });

  it("ignores a repeated id", () => {
    expect(sameSectionIds(["a", "a", "b"], ["a", "b"])).toBe(true);
  });

  it("notices an added or removed section", () => {
    expect(sameSectionIds(["a"], ["a", "b"])).toBe(false);
    expect(sameSectionIds(["a", "b"], ["a"])).toBe(false);
    expect(sameSectionIds(["a"], ["b"])).toBe(false);
  });
});

describe("facultyRowIsDirty", () => {
  it("is clean when nothing was touched", () => {
    expect(facultyRowIsDirty(draft(), base)).toBe(false);
  });

  it("notices each editable field", () => {
    expect(facultyRowIsDirty(draft({ status: "Non-resident" }), base)).toBe(true);
    expect(facultyRowIsDirty(draft({ designation: "Dean" }), base)).toBe(true);
    expect(facultyRowIsDirty(draft({ advisorySectionIds: ["sec-1"] }), base)).toBe(true);
  });

  it("does not call whitespace a change", () => {
    // Otherwise clicking into the designation box and out again would arm Save.
    expect(facultyRowIsDirty(draft({ designation: "  Regular Faculty  " }), base)).toBe(false);
  });

  it("notices clearing a designation", () => {
    expect(facultyRowIsDirty(draft({ designation: "" }), base)).toBe(true);
  });

  it("does not call a reordered advisory list a change", () => {
    expect(facultyRowIsDirty(draft({ advisorySectionIds: ["sec-2", "sec-1"] }), base)).toBe(false);
  });
});

describe("advisorySummaryLabel", () => {
  const names = new Map([
    ["sec-1", "BIT Auto 1A"],
    ["sec-2", "BIT Auto 2A"],
    ["sec-3", "BSIT 1A"],
  ]);

  it("says None rather than showing an empty cell", () => {
    expect(advisorySummaryLabel([], names)).toBe("None");
  });

  it("lists a short selection in full", () => {
    expect(advisorySummaryLabel(["sec-1"], names)).toBe("BIT Auto 1A");
    expect(advisorySummaryLabel(["sec-1", "sec-2"], names)).toBe("BIT Auto 1A, BIT Auto 2A");
  });

  it("counts the overflow instead of wrapping the row", () => {
    expect(advisorySummaryLabel(["sec-1", "sec-2", "sec-3"], names)).toBe("BIT Auto 1A, BIT Auto 2A +1");
  });

  it("skips an id with no section, rather than printing a blank", () => {
    // A section can be deleted while a profile still points at it.
    expect(advisorySummaryLabel(["sec-1", "gone"], names)).toBe("BIT Auto 1A");
    expect(advisorySummaryLabel(["gone"], names)).toBe("None");
  });
});
