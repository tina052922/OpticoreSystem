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

describe("isFacultyVisibleToRosterViewer — GEC Chairman", () => {
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

  it("ignores a locked department when the viewer is the GEC Chairman", () => {
    expect(
      isFacultyVisibleToRosterViewer(gecInstructor, { gecOnly: true, lockedProgramId: "prog-x" }),
    ).toBe(true);
  });
});

describe("isFacultyVisibleToRosterViewer — Program Chairman", () => {
  it("shows their own department", () => {
    const viewer = { lockedProgramId: "prog-bsit" };
    expect(isFacultyVisibleToRosterViewer(bsitInstructor, viewer)).toBe(true);
    expect(isFacultyVisibleToRosterViewer(autoInstructor, viewer)).toBe(false);
  });

  it("excludes GEC instructors even from their own department", () => {
    // Their load belongs to the GEC Chairman.
    expect(isFacultyVisibleToRosterViewer(gecInstructor, { lockedProgramId: "prog-bsit" })).toBe(
      false,
    );
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

  /** A College Admin manages their college's departments; GEC load belongs to the GEC Chairman. */
  it("shows department instructors and hides GEC ones", () => {
    expect(isFacultyVisibleToRosterViewer(bsitInstructor, viewer)).toBe(true);
    expect(isFacultyVisibleToRosterViewer(autoInstructor, viewer)).toBe(true);
    expect(isFacultyVisibleToRosterViewer(noDepartment, viewer)).toBe(true);
    expect(isFacultyVisibleToRosterViewer(gecInstructor, viewer)).toBe(false);
  });

  it("hides a GEC instructor whatever department they are housed in", () => {
    expect(
      isFacultyVisibleToRosterViewer(
        { role: "instructor", facultyCategory: "gec", chairmanProgramId: "prog-bit-auto" },
        viewer,
      ),
    ).toBe(false);
  });

  it("still defers to the GEC Chairman's own view when both are set", () => {
    // `gecOnly` is decided first, so the GEC page is never emptied by this flag.
    expect(
      isFacultyVisibleToRosterViewer(gecInstructor, { gecOnly: true, excludeGec: true }),
    ).toBe(true);
  });
});
