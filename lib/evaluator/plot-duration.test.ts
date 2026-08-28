import { describe, expect, it } from "vitest";
import {
  clampPlotStartSlotIndex,
  inferDurationSlotsFromTimes,
  timesFromSlotRange,
} from "./plot-duration";
import { DAY_ONE_HOUR_SLOTS, NIGHT_FULL_DAY_SLOTS } from "@/lib/scheduling/program-mode";

describe("clampPlotStartSlotIndex", () => {
  it("does not slide a Night 6:00 PM start onto the Day 4:00 PM cell", () => {
    const sixPm = NIGHT_FULL_DAY_SLOTS.findIndex((s) => s.startTime === "18:00");
    const fourPm = NIGHT_FULL_DAY_SLOTS.findIndex((s) => s.startTime === "16:00");
    expect(sixPm).toBe(11);
    expect(fourPm).toBe(9);
    expect(clampPlotStartSlotIndex(sixPm, 1, NIGHT_FULL_DAY_SLOTS.length)).toBe(11);
    expect(clampPlotStartSlotIndex(sixPm, 2, NIGHT_FULL_DAY_SLOTS.length)).toBe(11);
    expect(clampPlotStartSlotIndex(sixPm, 1, DAY_ONE_HOUR_SLOTS.length)).toBe(11);
  });

  it("leaves unplaced rows at -1", () => {
    expect(clampPlotStartSlotIndex(-1, 1, NIGHT_FULL_DAY_SLOTS.length)).toBe(-1);
  });
});

describe("timesFromSlotRange night placement", () => {
  it("keeps a 1-hour Night plot at 6:00 PM – 7:00 PM", () => {
    const start = NIGHT_FULL_DAY_SLOTS.findIndex((s) => s.startTime === "18:00");
    expect(timesFromSlotRange(start, 1, NIGHT_FULL_DAY_SLOTS)).toEqual({
      startTime: "18:00:00",
      endTime: "19:00:00",
    });
  });

  it("keeps a 2-hour Night plot at 6:00 PM – 8:00 PM", () => {
    const start = NIGHT_FULL_DAY_SLOTS.findIndex((s) => s.startTime === "18:00");
    expect(timesFromSlotRange(start, 2, NIGHT_FULL_DAY_SLOTS)).toEqual({
      startTime: "18:00:00",
      endTime: "20:00:00",
    });
  });

  it("does not remap a Night 6:00 PM index onto the Day 4:00 PM slot", () => {
    const sixPm = NIGHT_FULL_DAY_SLOTS.findIndex((s) => s.startTime === "18:00");
    expect(timesFromSlotRange(sixPm, 1, DAY_ONE_HOUR_SLOTS)).toBeNull();
  });

  it("still maps Day 4:00 PM – 5:00 PM on the day grid", () => {
    const start = DAY_ONE_HOUR_SLOTS.findIndex((s) => s.startTime === "16:00");
    expect(timesFromSlotRange(start, 1, DAY_ONE_HOUR_SLOTS)).toEqual({
      startTime: "16:00:00",
      endTime: "17:00:00",
    });
  });
});

describe("inferDurationSlotsFromTimes", () => {
  it("reads a 2-hour Night meeting from saved times", () => {
    expect(inferDurationSlotsFromTimes("18:00", "20:00")).toBe(2);
  });
});
