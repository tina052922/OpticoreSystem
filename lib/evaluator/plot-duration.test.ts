import { describe, expect, it } from "vitest";
import { prospectusRowForProgram } from "@/lib/chairman/prospectus-registry";
import {
  clampPlotStartSlotIndex,
  inferDurationSlotsFromTimes,
  maxPlotDurationSlots,
  maxPlotDurationSlotsForSubject,
  plottedDurationHours,
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

describe("maxPlotDurationSlots", () => {
  it("converts lecture units 1:1 into hours", () => {
    const row = prospectusRowForProgram("BSIT", "GEC-US");
    expect(row).toBeDefined();
    expect(maxPlotDurationSlots(row!)).toBe(3);
  });

  it("converts lab units 1 unit = 3 hours", () => {
    const row = prospectusRowForProgram("BSIT", "CC-112L");
    expect(row).toBeDefined();
    expect(row!.labUnits).toBe(3);
    expect(maxPlotDurationSlots(row!)).toBe(9);
  });
});

describe("maxPlotDurationSlotsForSubject", () => {
  it("uses catalog lab units when there is no prospectus row", () => {
    expect(
      maxPlotDurationSlotsForSubject("UNKNOWN", {
        id: "x",
        programId: "p",
        code: "LAB-1",
        title: "Lab",
        subcode: null,
        lecUnits: 0,
        labUnits: 1,
        lecHours: 0,
        labHours: 3,
        yearLevel: 1,
        semester: 1,
      }),
    ).toBe(3);
  });
});

describe("plottedDurationHours", () => {
  it("keeps actual plotted hours even when they exceed a subject cap", () => {
    expect(plottedDurationHours(9)).toBe(9);
    expect(plottedDurationHours(undefined)).toBe(1);
  });
});
