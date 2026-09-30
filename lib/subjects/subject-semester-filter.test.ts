import { describe, expect, it } from "vitest";
import {
  filterSubjectsBySemester,
  semesterFilterForPeriod,
  subjectMatchesSemesterFilter,
  subjectSemesterFilterLabel,
} from "./subject-semester-filter";
import type { AcademicPeriod } from "@/types/db";

const period = (fields: Partial<AcademicPeriod>) => fields as AcademicPeriod;

const rows = [
  { code: "CC-112", semester: 1 },
  { code: "CC-123", semester: 2 },
  // Real shapes from the catalog: the column is nullable and most rows never set it.
  { code: "AutoTech-111", semester: null },
  { code: "DTech-111" },
  { code: "GarTech-111", semester: "2" },
];

describe("subjectMatchesSemesterFilter", () => {
  it("keeps everything under All", () => {
    for (const row of rows) {
      expect(subjectMatchesSemesterFilter(row, "all")).toBe(true);
    }
  });

  it("matches a stored semester whether it is a number or a numeric string", () => {
    expect(subjectMatchesSemesterFilter({ semester: 2 }, "2")).toBe(true);
    expect(subjectMatchesSemesterFilter({ semester: "2" }, "2")).toBe(true);
    expect(subjectMatchesSemesterFilter({ semester: 1 }, "2")).toBe(false);
  });

  /**
   * The page has no semester control, so a row hidden here is unreachable. `Subject.semester` is
   * nullable and most rows have no value, so unset has to mean "show it" - otherwise switching the
   * sidebar term would make the majority of the catalog look deleted, with no way to bring it back.
   */
  it("shows a subject with no semester recorded under every term", () => {
    for (const semester of [null, undefined, "", "  ", 0, 3, "first"]) {
      expect(subjectMatchesSemesterFilter({ semester }, "1")).toBe(true);
      expect(subjectMatchesSemesterFilter({ semester }, "2")).toBe(true);
      expect(subjectMatchesSemesterFilter({ semester }, "all")).toBe(true);
    }
  });
});

describe("filterSubjectsBySemester", () => {
  it("splits the list by term, carrying the unset rows into both", () => {
    expect(filterSubjectsBySemester(rows, "1").map((s) => s.code)).toEqual([
      "CC-112",
      "AutoTech-111",
      "DTech-111",
    ]);
    expect(filterSubjectsBySemester(rows, "2").map((s) => s.code)).toEqual([
      "CC-123",
      "AutoTech-111",
      "DTech-111",
      "GarTech-111",
    ]);
  });

  it("hides only the rows that belong to the other semester", () => {
    expect(filterSubjectsBySemester(rows, "1").map((s) => s.code)).not.toContain("CC-123");
    expect(filterSubjectsBySemester(rows, "2").map((s) => s.code)).not.toContain("CC-112");
  });

  it("never loses a row that carries no semester", () => {
    const unset = rows.filter((s) => !("semester" in s) || s.semester == null).map((s) => s.code);
    for (const filter of ["all", "1", "2"] as const) {
      const shown = filterSubjectsBySemester(rows, filter).map((s) => s.code);
      for (const code of unset) expect(shown).toContain(code);
    }
  });

  it("returns a copy rather than the original array", () => {
    const all = filterSubjectsBySemester(rows, "all");
    expect(all).toEqual(rows);
    expect(all).not.toBe(rows);
  });
});

describe("semesterFilterForPeriod", () => {
  it("matches the terms in the sidebar", () => {
    // Both rows exactly as AcademicPeriod stores them.
    expect(
      semesterFilterForPeriod(
        period({
          id: "a0d6bdfe-a867-4432-89fc-f338fdc27e7c",
          name: "1st Semester, AY 2026-2027",
          semester: "1st Semester",
          academicYear: "2026-2027",
        }),
      ),
    ).toBe("1");

    expect(
      semesterFilterForPeriod(
        period({
          id: "ap-2025-2",
          name: "2nd Semester, AY 2025-2026",
          semester: "2nd Semester",
          academicYear: "2025-2026",
        }),
      ),
    ).toBe("2");
  });

  it("reads a term that only carries a numeric semester", () => {
    expect(semesterFilterForPeriod(period({ semester: "2", name: "Term B" }))).toBe("2");
    expect(semesterFilterForPeriod(period({ semester: "1", name: "Term A" }))).toBe("1");
  });

  it("shows everything rather than guessing when the term says nothing", () => {
    // Hiding half the catalog on a guess is worse than showing all of it.
    expect(semesterFilterForPeriod(null)).toBe("all");
    expect(semesterFilterForPeriod(undefined)).toBe("all");
    expect(semesterFilterForPeriod(period({ name: "Summer", semester: "" }))).toBe("all");
  });
});

describe("subjectSemesterFilterLabel", () => {
  it("names the term for the empty state", () => {
    expect(subjectSemesterFilterLabel("1")).toBe("1st Semester");
    expect(subjectSemesterFilterLabel("2")).toBe("2nd Semester");
    expect(subjectSemesterFilterLabel("all")).toBe("All semesters");
  });
});
