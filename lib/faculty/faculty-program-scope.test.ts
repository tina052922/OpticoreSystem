import { describe, expect, it } from "vitest";
import {
  advisoryProgramFilter,
  facultyMatchesProgramScope,
  sectionsInAdvisoryScope,
  type ProgramScopedFaculty,
} from "./faculty-program-scope";

/** Sections as the catalog holds them, so a section id resolves to its program. */
const sections = new Map<string, string>([
  ["sec-bsit-1a", "prog-bsit"],
  ["sec-bsit-2b", "prog-bsit"],
  ["sec-auto-1a", "prog-bit-auto"],
]);

const faculty = (over: Partial<ProgramScopedFaculty> = {}): ProgramScopedFaculty => ({ ...over });

describe("facultyMatchesProgramScope", () => {
  it("keeps everyone when no department is selected", () => {
    for (const programId of [null, undefined, "", "   "]) {
      expect(facultyMatchesProgramScope(faculty({ homeProgramId: "prog-bsit" }), programId, sections)).toBe(true);
      expect(facultyMatchesProgramScope(faculty(), programId, sections)).toBe(true);
    }
  });

  /**
   * The bug this exists for. The list matched on advisory sections alone and kept anyone with none,
   * and most faculty advise nothing — so picking a department changed almost nothing and the list
   * looked frozen. The department a faculty belongs to is their home program.
   */
  it("matches on the home department", () => {
    const bsit = faculty({ homeProgramId: "prog-bsit" });
    expect(facultyMatchesProgramScope(bsit, "prog-bsit", sections)).toBe(true);
    expect(facultyMatchesProgramScope(bsit, "prog-bit-auto", sections)).toBe(false);
  });

  it("does not keep a faculty just because they advise nothing", () => {
    // This is the exact condition that made the filter a no-op.
    expect(facultyMatchesProgramScope(faculty({ advisorySectionIds: [] }), "prog-bsit", sections)).toBe(false);
    expect(facultyMatchesProgramScope(faculty(), "prog-bsit", sections)).toBe(false);
  });

  it("falls back to advisory when no home department is recorded", () => {
    const advisesBsit = faculty({ advisorySectionIds: ["sec-bsit-2b"] });
    expect(facultyMatchesProgramScope(advisesBsit, "prog-bsit", sections)).toBe(true);
    expect(facultyMatchesProgramScope(advisesBsit, "prog-bit-auto", sections)).toBe(false);
  });

  it("prefers the home department over advisory when both are set", () => {
    // Teaching a section elsewhere does not move which department someone belongs to.
    const bsitAdvisingAuto = faculty({
      homeProgramId: "prog-bsit",
      advisorySectionIds: ["sec-auto-1a"],
    });
    expect(facultyMatchesProgramScope(bsitAdvisingAuto, "prog-bsit", sections)).toBe(true);
    expect(facultyMatchesProgramScope(bsitAdvisingAuto, "prog-bit-auto", sections)).toBe(false);
  });

  it("keeps a GEC instructor under every department", () => {
    // General education is taught across all of them, so no one department owns the person.
    const gec = faculty({ isGecInstructor: true });
    expect(facultyMatchesProgramScope(gec, "prog-bsit", sections)).toBe(true);
    expect(facultyMatchesProgramScope(gec, "prog-bit-auto", sections)).toBe(true);
  });

  it("ignores an advisory id whose section is unknown", () => {
    // A section can be deleted while a profile still points at it.
    const stale = faculty({ advisorySectionIds: ["sec-gone"] });
    expect(facultyMatchesProgramScope(stale, "prog-bsit", sections)).toBe(false);
  });

  it("tolerates whitespace around the stored ids", () => {
    expect(facultyMatchesProgramScope(faculty({ homeProgramId: " prog-bsit " }), "prog-bsit", sections)).toBe(true);
  });
});

describe("advisoryProgramFilter", () => {
  it("follows the scope bar's department", () => {
    expect(advisoryProgramFilter("prog-bsit", null)).toBe("prog-bsit");
  });

  it("falls back to a locked chairman program when the bar has none", () => {
    // The Chairman page's scope bar is display-only, so the lock is the only signal there.
    expect(advisoryProgramFilter(null, "prog-bsit")).toBe("prog-bsit");
  });

  it("lets the scope bar override the locked program", () => {
    expect(advisoryProgramFilter("prog-bit-auto", "prog-bsit")).toBe("prog-bit-auto");
  });

  it("is null when neither is set, which means every department in scope", () => {
    expect(advisoryProgramFilter(null, null)).toBeNull();
    expect(advisoryProgramFilter("", "")).toBeNull();
    expect(advisoryProgramFilter("   ", null)).toBeNull();
  });
});

describe("sectionsInAdvisoryScope", () => {
  const all = [
    { id: "sec-bsit-1a", programId: "prog-bsit" },
    { id: "sec-bsit-2b", programId: "prog-bsit" },
    { id: "sec-auto-1a", programId: "prog-bit-auto" },
  ];

  it("offers only the chosen department's sections", () => {
    expect(sectionsInAdvisoryScope(all, "prog-bsit").map((s) => s.id)).toEqual([
      "sec-bsit-1a",
      "sec-bsit-2b",
    ]);
  });

  /** The misalignment this exists for: picking a department left every section on the list. */
  it("drops another department's sections", () => {
    expect(sectionsInAdvisoryScope(all, "prog-bsit").map((s) => s.id)).not.toContain("sec-auto-1a");
  });

  it("offers everything in scope when no department is chosen", () => {
    expect(sectionsInAdvisoryScope(all, null)).toHaveLength(3);
  });

  it("returns a copy rather than the original array", () => {
    expect(sectionsInAdvisoryScope(all, null)).not.toBe(all);
  });
});
