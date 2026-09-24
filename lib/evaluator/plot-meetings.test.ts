import { describe, expect, it } from "vitest";
import { evaluatorTimeSlots } from "@/lib/chairman/bsit-evaluator-constants";
import type { HourSlot } from "@/lib/scheduling/program-mode";
import {
  durationHoursAfterDayChange,
  emptyPlotMeetingsDraft,
  filledPlotMeetingCount,
  resolvePlotMeetings,
  seedPlotMeetingsDraft,
  totalPlotMeetingHours,
  type PlotMeetingsDraft,
} from "./plot-meetings";

/** Real day-program hour slots, so time resolution behaves as it does in the app. */
const SLOTS: HourSlot[] = evaluatorTimeSlots("day");

const WEEKDAYS = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"] as const;

function draftWith(slots: Partial<{ day: unknown; durationHours: unknown }>[]): PlotMeetingsDraft {
  return {
    timeText: "8:00 AM",
    slots: slots as PlotMeetingsDraft["slots"],
  };
}

describe("seedPlotMeetingsDraft", () => {
  it("survives a row with no day — a vacant or brand-new entry", () => {
    // This is the crash: `day` arrived undefined and landed in the draft, so the first read of
    // `slot.day.trim()` threw and took the plot modal down.
    const draft = seedPlotMeetingsDraft({
      day: undefined,
      startSlotIndex: -1,
      durationSlots: 1,
      slots: SLOTS,
    });
    expect(draft.slots[0]).toEqual({ day: "", durationHours: "" });
    expect(() => totalPlotMeetingHours(draft, 3)).not.toThrow();
    expect(totalPlotMeetingHours(draft, 3)).toBe(0);
  });

  it("carries a real day and its duration", () => {
    const draft = seedPlotMeetingsDraft({
      day: "Tuesday",
      startSlotIndex: 1,
      durationSlots: 2,
      slots: SLOTS,
    });
    expect(draft.slots[0]).toEqual({ day: "Tuesday", durationHours: "2" });
    expect(draft.timeText).not.toBe("");
  });

  it("leaves the time blank when no slot is selected", () => {
    const draft = seedPlotMeetingsDraft({ day: "Monday", startSlotIndex: -1, slots: SLOTS });
    expect(draft.timeText).toBe("");
  });
});

describe("totalPlotMeetingHours", () => {
  it("ignores slots whose fields are missing entirely", () => {
    const draft = draftWith([{ day: undefined, durationHours: undefined }, {}, { day: "Monday", durationHours: "2" }]);
    expect(() => totalPlotMeetingHours(draft, 3)).not.toThrow();
    expect(totalPlotMeetingHours(draft, 3)).toBe(2);
  });

  it("sums every filled meeting", () => {
    const draft = draftWith([
      { day: "Monday", durationHours: "2" },
      { day: "Tuesday", durationHours: "1" },
      { day: "", durationHours: "" },
    ]);
    expect(totalPlotMeetingHours(draft, 3)).toBe(3);
  });

  it("skips a duration outside the allowed range", () => {
    const draft = draftWith([{ day: "Monday", durationHours: "9" }]);
    expect(totalPlotMeetingHours(draft, 3)).toBe(0);
  });
});

describe("filledPlotMeetingCount", () => {
  it("counts only the days actually chosen", () => {
    expect(filledPlotMeetingCount(emptyPlotMeetingsDraft())).toBe(0);
    expect(
      filledPlotMeetingCount(draftWith([{ day: "Monday" }, { day: undefined }, { day: "  " }])),
    ).toBe(1);
  });
});

describe("durationHoursAfterDayChange", () => {
  it("clears the hours when the day is cleared", () => {
    expect(durationHoursAfterDayChange("", "2")).toBe("");
    expect(durationHoursAfterDayChange(undefined, "2")).toBe("");
  });

  it("defaults to one hour when a day is chosen", () => {
    expect(durationHoursAfterDayChange("Monday", "")).toBe("1");
    expect(durationHoursAfterDayChange("Monday", undefined)).toBe("1");
  });

  it("keeps hours the user already typed", () => {
    expect(durationHoursAfterDayChange("Monday", "3")).toBe("3");
  });
});

describe("resolvePlotMeetings", () => {
  const args = { slots: SLOTS, programMode: "day" as const, maxDur: 3, weekdays: WEEKDAYS };

  it("does not throw on slots with missing fields", () => {
    const draft = draftWith([{ day: undefined, durationHours: undefined }]);
    expect(() => resolvePlotMeetings(draft, args)).not.toThrow();
    expect(resolvePlotMeetings(draft, args)).toMatchObject({ ok: false });
  });

  it("resolves a filled meeting", () => {
    const draft = draftWith([{ day: "Monday", durationHours: "2" }]);
    const result = resolvePlotMeetings(draft, args);
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.meetings).toHaveLength(1);
      expect(result.meetings[0]).toMatchObject({ day: "Monday", durationSlots: 2 });
    }
  });

  it("rejects a duration with no day", () => {
    const draft = draftWith([{ day: "", durationHours: "2" }]);
    expect(resolvePlotMeetings(draft, args)).toMatchObject({ ok: false });
  });

  it("rejects the same day twice", () => {
    const draft = draftWith([
      { day: "Monday", durationHours: "1" },
      { day: "Monday", durationHours: "1" },
    ]);
    expect(resolvePlotMeetings(draft, args)).toMatchObject({ ok: false });
  });

  it("requires a start time", () => {
    const draft: PlotMeetingsDraft = { timeText: "  ", slots: [{ day: "Monday", durationHours: "1" }] };
    expect(resolvePlotMeetings(draft, args)).toMatchObject({ ok: false });
  });
});
