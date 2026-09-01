import { describe, expect, it } from "vitest";
import {
  hoursExceedSubjectRequirement,
  plottedHoursForSubjectSection,
  requiredWeeklyContactHours,
  subjectHoursOverLimitMessage,
} from "./subject-semester-hours";

describe("requiredWeeklyContactHours", () => {
  it("uses prospectus lec+lab for a known BSIT subject", () => {
    expect(requiredWeeklyContactHours({ programCode: "BSIT", subjectCode: "GEC-US" })).toBe(3);
  });

  it("falls back to catalog hours when prospectus is missing", () => {
    expect(
      requiredWeeklyContactHours({
        programCode: "UNKNOWN",
        subjectCode: "XYZ-999",
        lecHours: 2,
        labHours: 3,
      }),
    ).toBe(5);
  });
});

describe("plottedHoursForSubjectSection", () => {
  const meetings = [
    { id: "a", sectionId: "s1", subjectCode: "GEC-US", hours: 1 },
    { id: "b", sectionId: "s1", subjectCode: "GEC-US", hours: 1 },
    { id: "c", sectionId: "s1", subjectCode: "CC-111", hours: 3 },
    { id: "d", sectionId: "s2", subjectCode: "GEC-US", hours: 3 },
  ];

  it("sums hours for the same section and subject, excluding the active row", () => {
    expect(
      plottedHoursForSubjectSection({
        meetings,
        sectionId: "s1",
        subjectCode: "GEC-US",
        excludeId: "a",
      }),
    ).toBe(1);
  });
});

describe("hoursExceedSubjectRequirement", () => {
  it("blocks when weekly plotted hours would pass the required total", () => {
    expect(
      hoursExceedSubjectRequirement({
        requiredHours: 3,
        alreadyPlottedHours: 2,
        additionalHours: 2,
      }),
    ).toBe(true);
  });

  it("allows an exact match of the required total", () => {
    expect(
      hoursExceedSubjectRequirement({
        requiredHours: 3,
        alreadyPlottedHours: 2,
        additionalHours: 1,
      }),
    ).toBe(false);
  });

  it("does not block when required hours are unknown", () => {
    expect(
      hoursExceedSubjectRequirement({
        requiredHours: 0,
        alreadyPlottedHours: 4,
        additionalHours: 2,
      }),
    ).toBe(false);
  });
});

describe("subjectHoursOverLimitMessage", () => {
  it("names the subject and required total", () => {
    const msg = subjectHoursOverLimitMessage({
      subjectCode: "GEC-US",
      requiredHours: 3,
      alreadyPlottedHours: 2,
      additionalHours: 2,
    });
    expect(msg).toContain("GEC-US");
    expect(msg).toContain("3");
  });
});
