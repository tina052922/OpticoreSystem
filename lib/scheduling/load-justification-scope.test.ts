import { describe, expect, it } from "vitest";
import {
  loadJustificationRequiredForSave,
  type FacultyLoadRow,
} from "./facultyPolicies";

const row = (instructorId: string, violationCodes: string[]): FacultyLoadRow =>
  ({
    instructorId,
    instructorName: instructorId,
    weeklyTotalContactHours: 0,
    weeklyLectureHours: 0,
    weeklyLabHours: 0,
    preparations: 1,
    weeklyUnits: 0,
    subjectCodes: [],
    status: null,
    designation: null,
    effectiveTeachingCap: null,
    violations: violationCodes.map((code) => ({ code, message: code })),
  }) as unknown as FacultyLoadRow;

/** A real code from `TEACHING_LOAD_JUSTIFICATION_CODES`. */
const OVER_CAP = "OVER_STANDARD_TEACHING_LOAD";

describe("loadJustificationRequiredForSave", () => {
  /**
   * The report this exists for. The GEC Chairman saved one row with a single prep and was asked to
   * justify it, because a different department's instructor was over cap in the same campus-wide
   * evaluation.
   */
  it("does not ask about an instructor the save never touched", () => {
    const rows = [row("u-other", [OVER_CAP]), row("u-gec", [])];
    expect(loadJustificationRequiredForSave(rows, new Set(["u-gec"]))).toBe(false);
  });

  it("asks when the instructor being plotted is over the line", () => {
    const rows = [row("u-other", []), row("u-gec", [OVER_CAP])];
    expect(loadJustificationRequiredForSave(rows, new Set(["u-gec"]))).toBe(true);
  });

  it("asks when any one of several touched instructors is over the line", () => {
    const rows = [row("u-a", []), row("u-b", [OVER_CAP])];
    expect(loadJustificationRequiredForSave(rows, new Set(["u-a", "u-b"]))).toBe(true);
  });

  it("does not ask when nobody is over the line", () => {
    const rows = [row("u-a", []), row("u-b", [])];
    expect(loadJustificationRequiredForSave(rows, new Set(["u-a", "u-b"]))).toBe(false);
  });

  it("does not ask when the save touches no instructor", () => {
    // Vacant rows carry the placeholder and are filtered out before this point.
    expect(loadJustificationRequiredForSave([row("u-a", [OVER_CAP])], new Set())).toBe(false);
  });

  it("ignores violations that are not teaching-load ones", () => {
    const rows = [row("u-gec", ["SOME_OTHER_ADVISORY_NOTE"])];
    expect(loadJustificationRequiredForSave(rows, new Set(["u-gec"]))).toBe(false);
  });
});
