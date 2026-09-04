import { describe, expect, it } from "vitest";
import {
  labHoursFromUnits,
  lectureHoursFromUnits,
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
