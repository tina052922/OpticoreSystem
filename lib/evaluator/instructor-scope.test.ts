import { describe, expect, it } from "vitest";
import { filterInstructorsForDepartment, isInstructorInDepartment } from "./instructor-scope";

const bsit = { id: "u1", chairmanProgramId: "prog-bsit", facultyCategory: "program" };
const bitAuto = { id: "u2", chairmanProgramId: "prog-bit-auto", facultyCategory: "program" };
const gec = { id: "u3", chairmanProgramId: null, facultyCategory: "gec" };
const unassigned = { id: "u4", chairmanProgramId: null, facultyCategory: null };

describe("isInstructorInDepartment", () => {
  it("accepts the department's own faculty", () => {
    expect(isInstructorInDepartment(bsit, "prog-bsit")).toBe(true);
  });

  it("rejects a sibling department in the same college", () => {
    expect(isInstructorInDepartment(bitAuto, "prog-bsit")).toBe(false);
  });

  it("rejects a GEC instructor, who is plotted by the GEC Chairman", () => {
    expect(isInstructorInDepartment(gec, "prog-bsit")).toBe(false);
    // Even one tagged with a department: the category decides.
    expect(isInstructorInDepartment({ ...gec, chairmanProgramId: "prog-bsit" }, "prog-bsit")).toBe(false);
  });

  it("rejects faculty with no department on file", () => {
    expect(isInstructorInDepartment(unassigned, "prog-bsit")).toBe(false);
  });

  it("allows everyone when no department is in scope (College Admin, DOI)", () => {
    expect(isInstructorInDepartment(bitAuto, null)).toBe(true);
    expect(isInstructorInDepartment(gec, "")).toBe(true);
  });
});

describe("filterInstructorsForDepartment", () => {
  const all = [bsit, bitAuto, gec, unassigned];

  it("keeps only the department's faculty", () => {
    expect(filterInstructorsForDepartment(all, "prog-bsit").map((u) => u.id)).toEqual(["u1"]);
  });

  it("keeps an instructor who already holds a plotted row, so it stays resolvable", () => {
    const kept = filterInstructorsForDepartment(all, "prog-bsit", new Set(["u4"]));
    expect(kept.map((u) => u.id)).toEqual(["u1", "u4"]);
  });

  it("does not narrow when there is no department in scope", () => {
    expect(filterInstructorsForDepartment(all, null)).toHaveLength(4);
    expect(filterInstructorsForDepartment(all, "  ")).toHaveLength(4);
  });
});
