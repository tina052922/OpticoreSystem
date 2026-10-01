import { describe, expect, it } from "vitest";
import { filterInstructorsForDepartment, filterInstructorsForGec, isInstructorInDepartment } from "./instructor-scope";

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

describe("filterInstructorsForGec", () => {
  const gecOne = { id: "g1", facultyCategory: "gec" };
  const gecTwo = { id: "g2", facultyCategory: "gec", chairmanProgramId: null };
  const bsit = { id: "p1", chairmanProgramId: "prog-bsit", facultyCategory: "program" };
  const auto = { id: "p2", chairmanProgramId: "prog-bit-auto", facultyCategory: "program" };
  const pool = [gecOne, bsit, gecTwo, auto];

  /**
   * The gap this closes. The GEC evaluator offered the whole college and only sorted GEC first, so a
   * GEC chairman could take a BSIT instructor's time for a general education slot.
   */
  it("offers only GEC instructors", () => {
    expect(filterInstructorsForGec(pool).map((u) => u.id)).toEqual(["g1", "g2"]);
  });

  it("does not offer a departmental instructor, whatever their department", () => {
    const ids = filterInstructorsForGec(pool).map((u) => u.id);
    expect(ids).not.toContain("p1");
    expect(ids).not.toContain("p2");
  });

  it("keeps an instructor already on a plotted row, so that row stays readable", () => {
    // Assigned before this rule existed; hiding them would leave a row nobody can resolve.
    const ids = filterInstructorsForGec(pool, new Set(["p1"])).map((u) => u.id);
    expect(ids).toEqual(["g1", "p1", "g2"]);
  });

  it("returns nothing when the college has no GEC instructors", () => {
    expect(filterInstructorsForGec([bsit, auto])).toEqual([]);
  });
});

/**
 * The three roles, in one place.
 *
 * Each rule lives in a different component — the chairman worksheet, the same worksheet with the
 * department lock released, and the GEC hub — so this is where they are stated together and can be
 * read against each other.
 */
describe("who each role may plot", () => {
  const faculty = [
    { id: "alberca", chairmanProgramId: "prog-bsit", facultyCategory: "program" },
    { id: "batumbakal", chairmanProgramId: "prog-bsit", facultyCategory: "program" },
    { id: "enoc", chairmanProgramId: "prog-bsit", facultyCategory: "program" },
    { id: "delacruz", chairmanProgramId: "prog-bit-auto", facultyCategory: "program" },
    { id: "wick", chairmanProgramId: null, facultyCategory: "gec" },
  ];

  it("College Admin: everyone in the college, GEC included", () => {
    // The worksheet passes a null department for this role, which releases the lock.
    expect(filterInstructorsForDepartment(faculty, null).map((u) => u.id)).toEqual([
      "alberca",
      "batumbakal",
      "enoc",
      "delacruz",
      "wick",
    ]);
  });

  it("Program Chairman: their own department only", () => {
    expect(filterInstructorsForDepartment(faculty, "prog-bsit").map((u) => u.id)).toEqual([
      "alberca",
      "batumbakal",
      "enoc",
    ]);
    expect(filterInstructorsForDepartment(faculty, "prog-bit-auto").map((u) => u.id)).toEqual([
      "delacruz",
    ]);
  });

  it("Program Chairman: no sibling department, and no GEC instructor", () => {
    const bsit = filterInstructorsForDepartment(faculty, "prog-bsit").map((u) => u.id);
    expect(bsit).not.toContain("delacruz");
    // GEC load is the GEC Chairman's to plot, so the person is not in two chairmen's hands.
    expect(bsit).not.toContain("wick");
  });

  it("GEC Chairman: GEC instructors only, whatever college they sit in", () => {
    expect(filterInstructorsForGec(faculty).map((u) => u.id)).toEqual(["wick"]);
  });

  it("the three lists together cover everyone, and only GEC is shared", () => {
    const admin = new Set(filterInstructorsForDepartment(faculty, null).map((u) => u.id));
    const chairs = [
      ...filterInstructorsForDepartment(faculty, "prog-bsit"),
      ...filterInstructorsForDepartment(faculty, "prog-bit-auto"),
    ].map((u) => u.id);
    const gec = filterInstructorsForGec(faculty).map((u) => u.id);

    // No faculty is plottable by two different chairmen.
    expect(new Set(chairs).size).toBe(chairs.length);
    for (const id of gec) expect(chairs).not.toContain(id);
    // Between them the chairmen and the GEC chairman reach everyone the admin can.
    expect(new Set([...chairs, ...gec])).toEqual(admin);
  });
});
