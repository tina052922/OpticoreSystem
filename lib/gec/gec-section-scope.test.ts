import { describe, expect, it } from "vitest";
import { sectionHasGecSubjectsInScope } from "./gec-section-scope";

describe("sectionHasGecSubjectsInScope", () => {
  /**
   * The case from the screenshot. BSIT-4B is Year 4 · 1st Semester, where the prospectus carries
   * only major subjects — the summary says "No GEC subjects found for the selected scope", so the
   * section has no business being in the GEC Chairman's picker.
   */
  it("is false for BSIT year 4, which has no general education", () => {
    expect(sectionHasGecSubjectsInScope({ programCode: "BSIT", yearLevel: 4, semester: 1 })).toBe(false);
    expect(sectionHasGecSubjectsInScope({ programCode: "BSIT", yearLevel: 4, semester: 2 })).toBe(false);
    expect(sectionHasGecSubjectsInScope({ programCode: "BSIT", yearLevel: 4, semester: null })).toBe(false);
  });

  it("is true for a BSIT year that does carry general education", () => {
    // First year is where the GEC load sits.
    expect(sectionHasGecSubjectsInScope({ programCode: "BSIT", yearLevel: 1, semester: 1 })).toBe(true);
  });

  it("is true across all years when the section name carries no year level", () => {
    expect(sectionHasGecSubjectsInScope({ programCode: "BSIT", yearLevel: null, semester: null })).toBe(true);
  });

  /** A different state with its own message; nothing is known, so nothing is hidden. */
  it("keeps sections of a program with no prospectus on file", () => {
    expect(sectionHasGecSubjectsInScope({ programCode: "BACOMM", yearLevel: 4, semester: 1 })).toBe(true);
    expect(sectionHasGecSubjectsInScope({ programCode: "NOT-A-PROGRAM", yearLevel: 1 })).toBe(true);
  });

  it("keeps a section whose program is not resolved yet", () => {
    expect(sectionHasGecSubjectsInScope({ programCode: "" })).toBe(true);
    expect(sectionHasGecSubjectsInScope({ programCode: null })).toBe(true);
  });
});
