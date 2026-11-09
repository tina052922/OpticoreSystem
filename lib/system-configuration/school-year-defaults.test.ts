import { describe, expect, it } from "vitest";
import {
  defaultSchoolYearDraft,
  periodContainingDate,
  schoolYearStartFor,
  suggestedSchoolYearDraft,
  todayYmd,
} from "./school-year-defaults";

describe("school year defaults", () => {
  it("reads the school year from the computer date", () => {
    expect(schoolYearStartFor(new Date(2026, 10, 10))).toBe(2026); // Nov 2026
    expect(schoolYearStartFor(new Date(2027, 1, 14))).toBe(2026); // Feb 2027
    expect(schoolYearStartFor(new Date(2027, 7, 1))).toBe(2027); // Aug 2027
  });

  it("defaults to Aug–Dec and Jan–Jun", () => {
    expect(defaultSchoolYearDraft(2026)).toEqual({
      academicYear: "2026-2027",
      firstSemester: { startDate: "2026-08-01", endDate: "2026-12-31" },
      secondSemester: { startDate: "2027-01-01", endDate: "2027-06-30" },
    });
  });

  it("skips a complete school year but offers one that is missing a semester", () => {
    expect(suggestedSchoolYearDraft(["2026-2027", "2026-2027"], new Date(2026, 10, 10)).academicYear).toBe("2027-2028");
    expect(suggestedSchoolYearDraft(["2026-2027"], new Date(2026, 10, 10)).academicYear).toBe("2026-2027");
  });

  it("finds the semester containing today", () => {
    const d = defaultSchoolYearDraft(2026);
    const periods = [
      { id: "1", ...d.firstSemester },
      { id: "2", ...d.secondSemester },
    ];
    expect(periodContainingDate(periods, todayYmd(new Date(2026, 10, 10)))?.id).toBe("1");
    expect(periodContainingDate(periods, "2027-03-01")?.id).toBe("2");
    expect(periodContainingDate(periods, "2027-07-15")).toBeNull();
  });
});
