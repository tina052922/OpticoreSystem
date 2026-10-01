import { describe, expect, it } from "vitest";
import {
  labHoursFromUnits,
  lectureHoursFromUnits,
  subjectLecLabHours,
  subjectWeeklyContactHours,
  weeklyContactHoursFromUnits,
} from "./contact-hours";

describe("contact hours from units", () => {
  it("uses 1 lecture unit = 1 hour", () => {
    expect(lectureHoursFromUnits(3)).toBe(3);
    expect(lectureHoursFromUnits(2.5)).toBe(2.5);
    expect(lectureHoursFromUnits(0)).toBe(0);
  });

  it("uses 1 laboratory unit = 3 hours", () => {
    expect(labHoursFromUnits(1)).toBe(3);
    expect(labHoursFromUnits(3)).toBe(9);
    expect(labHoursFromUnits(0)).toBe(0);
  });

  it("sums lecture and lab weekly contact", () => {
    expect(weeklyContactHoursFromUnits(2, 1)).toBe(5);
    expect(weeklyContactHoursFromUnits(3, 0)).toBe(3);
    expect(weeklyContactHoursFromUnits(0, 3)).toBe(9);
  });
});

describe("subjectWeeklyContactHours", () => {
  /**
   * The regression this exists for, with the real row from the catalog. AP-1 is 2 lecture + 3
   * laboratory hours a week. Its stored units are 3 and 3, which the CHED conversion turns into
   * 3 + 9 = 12 — so the Evaluator summary asked for 12 hours and called a correct plot an overload.
   */
  it("follows the recorded hours, not the units (AP-1)", () => {
    const ap1 = { lecUnits: 3, labUnits: 3, lecHours: 2, labHours: 3 };
    expect(subjectWeeklyContactHours(ap1)).toBe(5);
    expect(subjectWeeklyContactHours(ap1)).not.toBe(12);
  });

  it("keeps the lecture and laboratory split as recorded", () => {
    expect(subjectLecLabHours({ lecUnits: 3, labUnits: 3, lecHours: 2, labHours: 3 })).toEqual({
      lecHours: 2,
      labHours: 3,
    });
  });

  it("reads a lecture-only subject", () => {
    expect(subjectWeeklyContactHours({ lecUnits: 3, labUnits: 0, lecHours: 3, labHours: 0 })).toBe(3);
  });

  it("reads a laboratory-only subject at its recorded hours", () => {
    // PC-3211L: 3 laboratory units recorded as 9 hours. Both agree here; hours still win.
    expect(subjectWeeklyContactHours({ lecUnits: 0, labUnits: 3, lecHours: 0, labHours: 9 })).toBe(9);
  });

  it("does not double a subject whose units were typed as hours", () => {
    // ElxTech-111 in the catalog: labUnits 12 alongside labHours 12.
    expect(subjectWeeklyContactHours({ lecUnits: 3, labUnits: 12, lecHours: 3, labHours: 12 })).toBe(15);
  });

  it("falls back to units only when no hours are recorded", () => {
    expect(subjectWeeklyContactHours({ lecUnits: 2, labUnits: 1, lecHours: 0, labHours: 0 })).toBe(5);
    expect(subjectWeeklyContactHours({ lecUnits: 3, labUnits: 0 })).toBe(3);
  });

  it("is zero when the subject carries neither", () => {
    expect(subjectWeeklyContactHours({})).toBe(0);
    expect(subjectLecLabHours({})).toEqual({ lecHours: 0, labHours: 0 });
  });

  it("ignores negative and unparseable values", () => {
    expect(subjectWeeklyContactHours({ lecHours: -2, labHours: 3 })).toBe(3);
    expect(subjectWeeklyContactHours({ lecHours: null, labHours: undefined, lecUnits: 2 })).toBe(2);
  });
});
