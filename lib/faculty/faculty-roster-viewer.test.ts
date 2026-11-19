import { describe, expect, it } from "vitest";
import { isFacultyVisibleToRosterViewer } from "./faculty-roster-visibility";

type Row = Parameters<typeof isFacultyVisibleToRosterViewer>[0];

const gecInstructor: Row = {
  role: "instructor",
  facultyCategory: "gec",
  chairmanProgramId: "prog-bsit",
};
const bsitInstructor: Row = {
  role: "instructor",
  facultyCategory: "program",
  chairmanProgramId: "prog-bsit",
};
const autoInstructor: Row = {
  role: "instructor",
  facultyCategory: "program",
  chairmanProgramId: "prog-bit-auto",
};
const noDepartment: Row = { role: "instructor", facultyCategory: "program" };

describe("isFacultyVisibleToRosterViewer — GEC Chairperson", () => {
  /**
   * The rule this exists for. The GEC Faculty Profile page carried a banner saying the list was GEC
   * only, but the filter behind it had been removed — so it showed every instructor in the college.
   */
  it("shows GEC instructors and nobody else", () => {
    const gecOnly = { gecOnly: true };
    expect(isFacultyVisibleToRosterViewer(gecInstructor, gecOnly)).toBe(true);
    expect(isFacultyVisibleToRosterViewer(bsitInstructor, gecOnly)).toBe(false);
    expect(isFacultyVisibleToRosterViewer(autoInstructor, gecOnly)).toBe(false);
    expect(isFacultyVisibleToRosterViewer(noDepartment, gecOnly)).toBe(false);
  });

  it("keeps a GEC instructor whatever department they are housed in", () => {
    // GEC is taught across departments, so the home department does not decide this.
    expect(
      isFacultyVisibleToRosterViewer(
        { role: "instructor", facultyCategory: "gec", chairmanProgramId: "prog-bit-auto" },
        { gecOnly: true },
      ),
    ).toBe(true);
    expect(
      isFacultyVisibleToRosterViewer(
        { role: "instructor", facultyCategory: "gec" },
        { gecOnly: true },
      ),
    ).toBe(true);
  });

  it("ignores a locked department when the viewer is the GEC Chairperson", () => {
    expect(
      isFacultyVisibleToRosterViewer(gecInstructor, { gecOnly: true, lockedProgramId: "prog-x" }),
    ).toBe(true);
  });
});

describe("isFacultyVisibleToRosterViewer — Program Chairperson", () => {
  it("shows their own department", () => {
    const viewer = { lockedProgramId: "prog-bsit" };
    expect(isFacultyVisibleToRosterViewer(bsitInstructor, viewer)).toBe(true);
    expect(isFacultyVisibleToRosterViewer(autoInstructor, viewer)).toBe(false);
  });

  it("includes GEC and 'both' instructors whose department is theirs", () => {
    // A GEC instructor drawn from BSIT is on BSIT's roster (marked GEC in the list).
    expect(isFacultyVisibleToRosterViewer(gecInstructor, { lockedProgramId: "prog-bsit" })).toBe(true);
    expect(
      isFacultyVisibleToRosterViewer({ ...gecInstructor, facultyCategory: "both" }, { lockedProgramId: "prog-bsit" }),
    ).toBe(true);
    // …but not another department's, nor a GEC instructor with no department.
    expect(isFacultyVisibleToRosterViewer(gecInstructor, { lockedProgramId: "prog-bit-auto" })).toBe(false);
    expect(
      isFacultyVisibleToRosterViewer({ role: "instructor", facultyCategory: "gec" }, { lockedProgramId: "prog-bsit" }),
    ).toBe(false);
  });

  it("keeps a faculty with no department recorded", () => {
    // A half-filled profile would otherwise be stranded with no one able to open it.
    expect(isFacultyVisibleToRosterViewer(noDepartment, { lockedProgramId: "prog-bsit" })).toBe(true);
  });

  it("tolerates whitespace around the stored ids", () => {
    expect(
      isFacultyVisibleToRosterViewer(
        { role: "instructor", facultyCategory: "program", chairmanProgramId: " prog-bsit " },
        { lockedProgramId: "prog-bsit" },
      ),
    ).toBe(true);
  });
});

describe("isFacultyVisibleToRosterViewer — College Admin / DOI", () => {
  it("shows everyone on the roster", () => {
    for (const row of [gecInstructor, bsitInstructor, autoInstructor, noDepartment]) {
      expect(isFacultyVisibleToRosterViewer(row, {})).toBe(true);
    }
  });

  it("treats a blank locked department as no lock", () => {
    expect(isFacultyVisibleToRosterViewer(autoInstructor, { lockedProgramId: "   " })).toBe(true);
  });
});

describe("isFacultyVisibleToRosterViewer — who is faculty at all", () => {
  it("never shows a non-instructor", () => {
    expect(isFacultyVisibleToRosterViewer({ role: "student" }, {})).toBe(false);
    expect(
      isFacultyVisibleToRosterViewer({ role: "college_admin", facultyCategory: "gec" }, { gecOnly: true }),
    ).toBe(false);
  });

  it("never shows a rejected registration", () => {
    expect(
      isFacultyVisibleToRosterViewer(
        { role: "instructor", facultyCategory: "gec", instructorValidation: "rejected" },
        { gecOnly: true },
      ),
    ).toBe(false);
  });

  it("still shows a pending registration, which is the profile someone must complete", () => {
    expect(
      isFacultyVisibleToRosterViewer(
        { role: "instructor", facultyCategory: "gec", instructorValidation: "pending" },
        { gecOnly: true },
      ),
    ).toBe(true);
  });
});

describe("isFacultyVisibleToRosterViewer — College Admin", () => {
  const viewer = { excludeGec: true };

  /** A College Admin manages their college's departments; GEC load belongs to the GEC Chairperson. */
  it("shows department instructors, and GEC instructors only when they belong to a department", () => {
    expect(isFacultyVisibleToRosterViewer(bsitInstructor, viewer)).toBe(true);
    expect(isFacultyVisibleToRosterViewer(autoInstructor, viewer)).toBe(true);
    expect(isFacultyVisibleToRosterViewer(noDepartment, viewer)).toBe(true);
    expect(isFacultyVisibleToRosterViewer(gecInstructor, viewer)).toBe(true);
    // A GEC instructor with no department stays with the GEC Chairperson.
    expect(isFacultyVisibleToRosterViewer({ role: "instructor", facultyCategory: "gec" }, viewer)).toBe(false);
  });

  it("still defers to the GEC Chairperson's own view when both are set", () => {
    // `gecOnly` is decided first, so the GEC page is never emptied by this flag.
    expect(
      isFacultyVisibleToRosterViewer(gecInstructor, { gecOnly: true, excludeGec: true }),
    ).toBe(true);
  });
});

describe("isFacultyVisibleToRosterViewer — 'both' category", () => {
  const both: Row = { role: "instructor", facultyCategory: "both", chairmanProgramId: "prog-bit-auto" };
  it("puts a 'both' instructor on the GEC Chairperson's roster too", () => {
    expect(isFacultyVisibleToRosterViewer(both, { gecOnly: true })).toBe(true);
  });
  it("keeps program-only instructors off the GEC Chairperson's roster", () => {
    expect(isFacultyVisibleToRosterViewer(bsitInstructor, { gecOnly: true })).toBe(false);
  });
});
