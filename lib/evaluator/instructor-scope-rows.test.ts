import { describe, expect, it } from "vitest";
import {
  filterInstructorsExcludingGec,
  filterInstructorsForGec,
  instructorIdsOnRowsInScope,
} from "./instructor-scope";

const entries = [
  { sectionId: "sec-1a", academicPeriodId: "ap-1", instructorId: "u-gec" },
  { sectionId: "sec-1a", academicPeriodId: "ap-1", instructorId: "u-legacy" },
  // Another section, same term — a different chairman's row.
  { sectionId: "sec-2b", academicPeriodId: "ap-1", instructorId: "u-bsit" },
  // Same section, a previous term.
  { sectionId: "sec-1a", academicPeriodId: "ap-0", instructorId: "u-old" },
];

describe("instructorIdsOnRowsInScope", () => {
  it("takes only the instructors on this section and term", () => {
    const ids = instructorIdsOnRowsInScope(entries, { sectionId: "sec-1a", academicPeriodId: "ap-1" });
    expect([...ids].sort()).toEqual(["u-gec", "u-legacy"]);
  });

  /** The leak this exists for: another section's instructor must not be exempted. */
  it("leaves out instructors plotted on other sections", () => {
    const ids = instructorIdsOnRowsInScope(entries, { sectionId: "sec-1a", academicPeriodId: "ap-1" });
    expect(ids.has("u-bsit")).toBe(false);
  });

  it("leaves out instructors from another term", () => {
    const ids = instructorIdsOnRowsInScope(entries, { sectionId: "sec-1a", academicPeriodId: "ap-1" });
    expect(ids.has("u-old")).toBe(false);
  });

  it("exempts nobody when no section is being edited", () => {
    expect(instructorIdsOnRowsInScope(entries, { sectionId: "", academicPeriodId: "ap-1" }).size).toBe(0);
    expect(instructorIdsOnRowsInScope(entries, { sectionId: null }).size).toBe(0);
  });

  it("ignores the term when none is given", () => {
    const ids = instructorIdsOnRowsInScope(entries, { sectionId: "sec-1a" });
    expect([...ids].sort()).toEqual(["u-gec", "u-legacy", "u-old"]);
  });

  it("skips rows with no instructor", () => {
    const ids = instructorIdsOnRowsInScope(
      [{ sectionId: "sec-1a", academicPeriodId: "ap-1", instructorId: "" }],
      { sectionId: "sec-1a", academicPeriodId: "ap-1" },
    );
    expect(ids.size).toBe(0);
  });
});

describe("filterInstructorsForGec with a scoped exemption", () => {
  const users = [
    { id: "u-gec", facultyCategory: "gec" },
    { id: "u-bsit", facultyCategory: "program", chairmanProgramId: "prog-bsit" },
    { id: "u-legacy", facultyCategory: "program", chairmanProgramId: "prog-bsit" },
  ];

  /**
   * The reported bug, end to end. The picker filtered to GEC and then handed the exemption every
   * plotted instructor in the term, so a departmental instructor came straight back into the list.
   */
  it("shows GEC instructors plus only those on this section's rows", () => {
    const exempt = instructorIdsOnRowsInScope(entries, {
      sectionId: "sec-1a",
      academicPeriodId: "ap-1",
    });
    const ids = filterInstructorsForGec(users, exempt).map((u) => u.id);
    expect(ids).toEqual(["u-gec", "u-legacy"]);
    expect(ids).not.toContain("u-bsit");
  });

  it("shows GEC instructors only when nothing is plotted here yet", () => {
    const ids = filterInstructorsForGec(users, new Set<string>()).map((u) => u.id);
    expect(ids).toEqual(["u-gec"]);
  });
});

describe("filterInstructorsExcludingGec", () => {
  const users = [
    { id: "u-gec", facultyCategory: "gec" },
    { id: "u-bsit", facultyCategory: "program", chairmanProgramId: "prog-bsit" },
    { id: "u-auto", facultyCategory: "program", chairmanProgramId: "prog-bit-auto" },
  ];

  /** A College Admin plots their departments; GEC load is the GEC Chairman's. */
  it("keeps every department of the college and drops the GEC instructors", () => {
    expect(filterInstructorsExcludingGec(users).map((u) => u.id)).toEqual(["u-bsit", "u-auto"]);
  });

  it("keeps a GEC instructor who already holds a row here, so it stays readable", () => {
    const ids = filterInstructorsExcludingGec(users, new Set(["u-gec"])).map((u) => u.id);
    expect(ids).toContain("u-gec");
  });

  it("returns everyone when none are GEC", () => {
    const program = users.filter((u) => u.id !== "u-gec");
    expect(filterInstructorsExcludingGec(program)).toHaveLength(2);
  });
});
