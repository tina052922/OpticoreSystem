import { describe, expect, it } from "vitest";
import { subjectHoursProgress } from "./subject-semester-hours";

const at = (plottedHours: number, requiredHours: number, plotted = true) =>
  subjectHoursProgress({ plottedHours, requiredHours, plotted });

describe("subjectHoursProgress", () => {
  /** The report this exists for: 1 of 5 hours was showing the same green tick as 5 of 5. */
  it("calls a part-plotted subject partial, not complete", () => {
    expect(at(1, 5)).toBe("partial");
    expect(at(4, 6)).toBe("partial");
    expect(at(1, 3)).toBe("partial");
  });

  it("calls a fully plotted subject complete", () => {
    expect(at(5, 5)).toBe("complete");
    expect(at(2, 2)).toBe("complete");
    expect(at(9, 9)).toBe("complete");
    expect(at(6, 6)).toBe("complete");
  });

  it("calls an over-plotted subject over", () => {
    expect(at(6, 5)).toBe("over");
    expect(at(3, 2)).toBe("over");
  });

  it("is none when nothing is plotted", () => {
    expect(at(0, 5)).toBe("none");
    expect(at(5, 5, false)).toBe("none");
  });

  it("tolerates floating point on half-hour plots", () => {
    // 1.5 + 1.5 + 1.5 + 1.5 does not land exactly on 6 in binary floating point.
    expect(at(1.5 + 1.5 + 1.5 + 1.5, 6)).toBe("complete");
    expect(at(2.5, 2.5)).toBe("complete");
    expect(at(2.4999999, 2.5)).toBe("complete");
  });

  /** No prospectus row and no recorded hours: nothing to be complete against. */
  it("never calls a subject complete when the requirement is unknown", () => {
    expect(at(3, 0)).toBe("partial");
    expect(at(3, -1)).toBe("partial");
  });

  it("ignores unparseable input rather than throwing", () => {
    expect(subjectHoursProgress({ plottedHours: NaN, requiredHours: 5, plotted: true })).toBe("none");
  });
});
