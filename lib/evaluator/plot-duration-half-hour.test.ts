import { describe, expect, it } from "vitest";
import {
  PLOT_STEP_HOURS,
  clampPlotStartSlotIndex,
  inferDurationSlotsFromTimes,
  plottedDurationHours,
  quantizePlotHours,
  timesFromSlotRange,
} from "./plot-duration";

/** The Day grid: 7:00 AM onwards, one row per hour. */
const slots = Array.from({ length: 10 }, (_, i) => ({
  startTime: `${String(7 + i).padStart(2, "0")}:00`,
  endTime: `${String(8 + i).padStart(2, "0")}:00`,
}));

/** The evaluator's own pitch: half-hour rows, 7:00 AM onwards. */
function halfHourSlots(count: number) {
  return Array.from({ length: count }, (_, i) => {
    const start = 7 * 60 + i * 30;
    const hhmm = (t: number) =>
      `${String(Math.floor(t / 60)).padStart(2, "0")}:${String(t % 60).padStart(2, "0")}`;
    return { startTime: hhmm(start), endTime: hhmm(start + 30) };
  });
}

describe("quantizePlotHours", () => {
  it("snaps to the nearest half hour", () => {
    expect(quantizePlotHours(1.5)).toBe(1.5);
    expect(quantizePlotHours(1.4)).toBe(1.5);
    expect(quantizePlotHours(1.2)).toBe(1);
    expect(quantizePlotHours(2.75)).toBe(3);
  });

  /** The bug this exists for: rounding to whole hours erased every 1.5 hour class. */
  it("does not round a half hour away", () => {
    expect(quantizePlotHours(1.5)).not.toBe(2);
    expect(quantizePlotHours(0.5)).toBe(0.5);
  });
});

describe("timesFromSlotRange", () => {
  it("ends on the hour for a whole-hour meeting", () => {
    // Index 3 on the Day grid is 10:00 AM.
    expect(timesFromSlotRange(3, 1, slots)).toEqual({ startTime: "10:00:00", endTime: "11:00:00" });
    expect(timesFromSlotRange(3, 2, slots)).toEqual({ startTime: "10:00:00", endTime: "12:00:00" });
  });

  /** The case asked for: 10:00 to 11:30. */
  it("ends at the half hour for a 1.5 hour meeting", () => {
    expect(timesFromSlotRange(3, 1.5, slots)).toEqual({
      startTime: "10:00:00",
      endTime: "11:30:00",
    });
  });

  it("handles a half-hour meeting", () => {
    expect(timesFromSlotRange(3, 0.5, slots)).toEqual({
      startTime: "10:00:00",
      endTime: "10:30:00",
    });
  });

  it("carries past the hour correctly", () => {
    expect(timesFromSlotRange(0, 2.5, slots)).toEqual({ startTime: "07:00:00", endTime: "09:30:00" });
  });

  it("returns null when the start is off the grid", () => {
    expect(timesFromSlotRange(99, 1, slots)).toBeNull();
  });
});

describe("clampPlotStartSlotIndex", () => {
  /**
   * The clamp counts rows, and the pitch comes from the table it is given: on the half-hour grid a
   * 1.5 hour class is three rows, on the hourly one it is two.
   */
  it("judges the last usable start in rows of the given table", () => {
    // 10 half-hour rows = five hours. A 1.5 hour class needs three of them.
    expect(clampPlotStartSlotIndex(9, 1.5, halfHourSlots(10))).toBe(7);
    expect(clampPlotStartSlotIndex(9, 1, halfHourSlots(10))).toBe(8);
    expect(clampPlotStartSlotIndex(9, 0.5, halfHourSlots(10))).toBe(9);
  });

  it("reads an hourly table as hourly", () => {
    expect(clampPlotStartSlotIndex(9, 1.5, slots)).toBe(8);
    expect(clampPlotStartSlotIndex(9, 1, slots)).toBe(9);
  });

  it("leaves a start that already fits alone", () => {
    expect(clampPlotStartSlotIndex(3, 1.5, slots)).toBe(3);
  });

  /** A Night index must not be dragged onto the shorter Day table. */
  it("keeps an index that belongs to another grid", () => {
    expect(clampPlotStartSlotIndex(11, 1.5, slots)).toBe(11);
  });
});

describe("inferDurationSlotsFromTimes", () => {
  it("reads a saved 1.5 hour meeting back as 1.5", () => {
    expect(inferDurationSlotsFromTimes("10:00", "11:30")).toBe(1.5);
    expect(inferDurationSlotsFromTimes("10:00:00", "11:30:00")).toBe(1.5);
  });

  it("reads whole hours unchanged", () => {
    expect(inferDurationSlotsFromTimes("10:00", "12:00")).toBe(2);
    expect(inferDurationSlotsFromTimes("10:00", "11:00")).toBe(1);
  });

  it("reads a half hour", () => {
    expect(inferDurationSlotsFromTimes("10:00", "10:30")).toBe(0.5);
  });

  it("falls back to an hour when the times make no sense", () => {
    expect(inferDurationSlotsFromTimes("11:00", "10:00")).toBe(1);
    expect(inferDurationSlotsFromTimes("", "")).toBe(1);
  });
});

describe("plottedDurationHours", () => {
  it("keeps the half hour that teaching load is counted from", () => {
    expect(plottedDurationHours(1.5)).toBe(1.5);
    expect(plottedDurationHours(0.5)).toBe(0.5);
    expect(plottedDurationHours(2)).toBe(2);
  });

  it("never returns less than one step", () => {
    expect(plottedDurationHours(0)).toBe(PLOT_STEP_HOURS);
    expect(plottedDurationHours(-3)).toBe(PLOT_STEP_HOURS);
    expect(plottedDurationHours(null)).toBe(1);
  });
});

/**
 * A round trip is what keeps the grid and the stored row agreeing: plot 1.5 hours, save, reopen,
 * and the card must still be 1.5 hours rather than having crept to 1 or 2.
 */
describe("round trip", () => {
  it("survives plot → save → reopen at every half step", () => {
    for (const dur of [0.5, 1, 1.5, 2, 2.5, 3]) {
      const times = timesFromSlotRange(0, dur, slots);
      expect(times, String(dur)).not.toBeNull();
      expect(inferDurationSlotsFromTimes(times!.startTime, times!.endTime), String(dur)).toBe(dur);
    }
  });
});
