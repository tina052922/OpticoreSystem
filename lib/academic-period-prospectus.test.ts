import { describe, expect, it } from "vitest";
import { prospectusSemesterFromAcademicPeriod } from "./academic-period-prospectus";
import type { AcademicPeriod } from "@/types/db";

const period = (fields: Partial<AcademicPeriod>) => fields as AcademicPeriod;

describe("prospectusSemesterFromAcademicPeriod", () => {
  it("reads the seeded terms, which spell the semester out", () => {
    expect(
      prospectusSemesterFromAcademicPeriod(
        period({ name: "1st Semester, AY 2026-2027", semester: "1st Semester", academicYear: "2026-2027" }),
      ),
    ).toBe(1);
    expect(
      prospectusSemesterFromAcademicPeriod(
        period({ name: "2nd Semester, AY 2025-2026", semester: "2nd Semester", academicYear: "2025-2026" }),
      ),
    ).toBe(2);
  });

  /**
   * DOI's "Add new academic period" form stores a bare "1" / "2" / "Summer". None of the phrase
   * patterns matched a lone digit, so every term created through the UI read as "no semester" — the
   * evaluator then offered subjects from both terms and this filter could not follow the sidebar.
   */
  it("reads the bare value the DOI form stores", () => {
    expect(prospectusSemesterFromAcademicPeriod(period({ semester: "1", name: "Term A" }))).toBe(1);
    expect(prospectusSemesterFromAcademicPeriod(period({ semester: "2", name: "Term B" }))).toBe(2);
    expect(prospectusSemesterFromAcademicPeriod(period({ semester: " 2 ", name: "Term B" }))).toBe(2);
  });

  it("never reads a semester out of the academic year", () => {
    // "AY 2025-2026" holds both digits; neither may be mistaken for a semester.
    expect(
      prospectusSemesterFromAcademicPeriod(
        period({ name: "Summer, AY 2025-2026", semester: "Summer", academicYear: "2025-2026" }),
      ),
    ).toBeNull();
    expect(
      prospectusSemesterFromAcademicPeriod(period({ name: "AY 2021-2022", semester: "" })),
    ).toBeNull();
  });

  it("falls back to the display name when the semester field is unhelpful", () => {
    expect(
      prospectusSemesterFromAcademicPeriod(period({ name: "Second Semester 2025", semester: "" })),
    ).toBe(2);
    expect(
      prospectusSemesterFromAcademicPeriod(period({ name: "First Sem 2025", semester: "" })),
    ).toBe(1);
  });

  it("returns null when there is nothing to read", () => {
    expect(prospectusSemesterFromAcademicPeriod(null)).toBeNull();
    expect(prospectusSemesterFromAcademicPeriod(undefined)).toBeNull();
    expect(prospectusSemesterFromAcademicPeriod(period({}))).toBeNull();
  });
});
