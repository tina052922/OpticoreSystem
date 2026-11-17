import { describe, expect, it } from "vitest";
import {
  coveredFacultyIds,
  justificationCoversLoad,
  justificationLoadSnapshot,
  justifiedNumbersOf,
} from "./justification-coverage";

const recorded = {
  academicPeriodId: "ap-1",
  facultyUserId: "u1",
  justification: "Only qualified faculty for the fourth preparation.",
  violationsSnapshot: { facultyWeeklyHours: 21, facultyPreparations: 4 },
};

describe("justifiedNumbersOf", () => {
  it("reads the Chairman worksheet keys", () => {
    expect(justifiedNumbersOf(recorded)).toEqual({ hours: 21, preparations: 4 });
  });

  it("reads the GEC Central Hub key for preparations", () => {
    expect(
      justifiedNumbersOf({ violationsSnapshot: { facultyWeeklyHours: 18, preparations: 5 } }),
    ).toEqual({ hours: 18, preparations: 5 });
  });

  it("is empty for records written before the numbers were stored", () => {
    expect(justifiedNumbersOf({ violationsSnapshot: { summary: "text only" } })).toEqual({
      hours: null,
      preparations: null,
    });
    expect(justifiedNumbersOf({ violationsSnapshot: null })).toEqual({ hours: null, preparations: null });
  });
});

describe("justificationCoversLoad", () => {
  it("covers the load it was recorded for", () => {
    expect(justificationCoversLoad(recorded, { weeklyTotalContactHours: 21, preparations: 4 })).toBe(true);
  });

  it("keeps covering when more is plotted later in the term (asked once only)", () => {
    expect(justificationCoversLoad(recorded, { weeklyTotalContactHours: 27, preparations: 6 })).toBe(true);
  });

  it("covers old records without stored numbers", () => {
    expect(
      justificationCoversLoad(
        { justification: "Reason", violationsSnapshot: { summary: "text only" } },
        { weeklyTotalContactHours: 21, preparations: 5 },
      ),
    ).toBe(true);
  });

  it("does not cover an empty justification", () => {
    expect(justificationCoversLoad({ justification: "  " }, { weeklyTotalContactHours: 1, preparations: 1 })).toBe(
      false,
    );
  });
});

describe("coveredFacultyIds", () => {
  const load = { instructorId: "u1", weeklyTotalContactHours: 21, preparations: 4 };

  it("covers a faculty whose load has not grown", () => {
    expect([...coveredFacultyIds([recorded], [load], "ap-1")]).toEqual(["u1"]);
  });

  it("does not re-prompt when more is plotted after the justification (once per term)", () => {
    const rePlotted = { ...load, preparations: 5 };
    expect([...coveredFacultyIds([recorded], [rePlotted], "ap-1")]).toEqual(["u1"]);
  });

  it("ignores records from another term", () => {
    expect([...coveredFacultyIds([recorded], [load], "ap-2")]).toEqual([]);
  });

  it("treats a faculty with no current plots as nothing to prompt about", () => {
    expect([...coveredFacultyIds([recorded], [], "ap-1")]).toEqual(["u1"]);
  });

  it("skips rows with no faculty id", () => {
    expect([...coveredFacultyIds([{ ...recorded, facultyUserId: null }], [load], "ap-1")]).toEqual([]);
  });

  it("keeps a faculty covered when any of their records covers the load", () => {
    const older = { ...recorded, violationsSnapshot: { facultyWeeklyHours: 30, facultyPreparations: 6 } };
    const rePlotted = { ...load, preparations: 5 };
    expect([...coveredFacultyIds([older, recorded], [rePlotted], "ap-1")]).toEqual(["u1"]);
  });
});

describe("justificationLoadSnapshot", () => {
  it("stores the numbers a later breach is compared against", () => {
    expect(
      justificationLoadSnapshot({ instructorId: "u1", weeklyTotalContactHours: 21.5, preparations: 4 }),
    ).toEqual({ facultyWeeklyHours: 21.5, facultyPreparations: 4 });
  });
});
