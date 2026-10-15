import { describe, expect, it } from "vitest";
import {
  formatPlotDurationHours,
  plotDurationChoices,
  resolvePlotMeetings,
  seedPlotMeetingsDraft,
  type PlotMeetingsDraft,
} from "./plot-meetings";
import { formatPlotTimeLines, formatPlotTimeRange } from "./plot-time-range";

/** The Day grid: 7:00 AM onwards, one row per hour. */
const slots = Array.from({ length: 10 }, (_, i) => ({
  slotIndex: i,
  label: `${7 + i}:00 - ${8 + i}:00`,
  startTime: `${String(7 + i).padStart(2, "0")}:00`,
  endTime: `${String(8 + i).padStart(2, "0")}:00`,
  startHour: 7 + i,
}));

describe("plotDurationChoices", () => {
  it("offers half-hour steps up to the subject's budget", () => {
    expect(plotDurationChoices(3)).toEqual([0.5, 1, 1.5, 2, 2.5, 3]);
  });

  it("never offers more than the budget", () => {
    expect(plotDurationChoices(1.5)).toEqual([0.5, 1, 1.5]);
  });

  it("still offers one step when the budget is nonsense", () => {
    expect(plotDurationChoices(0)).toEqual([0.5]);
  });
});

describe("formatPlotDurationHours", () => {
  it("writes whole hours without a decimal", () => {
    expect(formatPlotDurationHours(2)).toBe("2");
    expect(formatPlotDurationHours(1.5)).toBe("1.5");
  });
});

describe("resolvePlotMeetings", () => {
  function draft(timeText: string, durationHours: string): PlotMeetingsDraft {
    return {
      timeText,
      slots: [
        { day: "Monday", durationHours },
        { day: "", durationHours: "" },
        { day: "", durationHours: "" },
      ],
    };
  }

  const args = { slots, programMode: "day" as const, maxDur: 5, weekdays: ["Monday"] };

  /** The case asked for: a 10:00 AM start running an hour and a half. */
  it("accepts a 1.5 hour meeting", () => {
    const got = resolvePlotMeetings(draft("10:00 AM", "1.5"), args);
    expect(got.ok).toBe(true);
    if (got.ok) expect(got.meetings[0]?.durationSlots).toBe(1.5);
  });

  it("accepts half an hour", () => {
    const got = resolvePlotMeetings(draft("10:00 AM", "0.5"), args);
    expect(got.ok).toBe(true);
    if (got.ok) expect(got.meetings[0]?.durationSlots).toBe(0.5);
  });

  it("refuses more than the subject's budget", () => {
    expect(resolvePlotMeetings(draft("10:00 AM", "5.5"), args).ok).toBe(false);
  });

  /**
   * 4:00 PM is the last row, so a 1.5 hour meeting there would need a row that does not exist —
   * even though it would only half fill it.
   */
  it("refuses a meeting that runs off the end of the grid", () => {
    expect(resolvePlotMeetings(draft("4:00 PM", "1.5"), args).ok).toBe(false);
    expect(resolvePlotMeetings(draft("4:00 PM", "1"), args).ok).toBe(true);
  });
});

describe("seedPlotMeetingsDraft", () => {
  it("reopens a 1.5 hour meeting as 1.5, not 2", () => {
    const seeded = seedPlotMeetingsDraft({
      day: "Monday",
      startSlotIndex: 3,
      durationSlots: 1.5,
      slots,
    });
    expect(seeded.slots[0]?.durationHours).toBe("1.5");
  });
});

describe("formatPlotTimeRange", () => {
  it("names the half hour a meeting actually ends at", () => {
    expect(formatPlotTimeRange(3, 1.5, slots)).toBe("10:00 AM – 11:30 AM");
    expect(formatPlotTimeRange(3, 2, slots)).toBe("10:00 AM – 12:00 PM");
  });
});

describe("formatPlotTimeLines", () => {
  /** The partial row is trimmed, so the lines add up to the range instead of overstating it. */
  it("trims the last line of a meeting that ends on the half hour", () => {
    const got = formatPlotTimeLines(3, 1.5, slots);
    expect(got.fullLine).toBe("10:00 AM – 11:30 AM");
    expect(got.slotLines).toEqual(["10:00 - 11:00", "11:00 AM – 11:30 AM"]);
  });

  it("leaves whole-hour rows as their own labels", () => {
    expect(formatPlotTimeLines(3, 2, slots).slotLines).toEqual(["10:00 - 11:00", "11:00 - 12:00"]);
  });
});

/**
 * The grid is pitched in half hours so that back-to-back classes on the half hour are possible:
 * 1:00–2:30 for one subject, then 2:30–4:00 for the next, with no row claimed by both.
 */
describe("half-hour starts", () => {
  function draftAt(timeText: string, durationHours: string): PlotMeetingsDraft {
    return {
      timeText,
      slots: [
        { day: "Monday", durationHours },
        { day: "", durationHours: "" },
        { day: "", durationHours: "" },
      ],
    };
  }

  /** The evaluator's own grid: half-hour rows, 7:00 AM to 5:00 PM. */
  const gridSlots = Array.from({ length: 20 }, (_, i) => {
    const start = 7 * 60 + i * 30;
    const hhmm = (t: number) =>
      `${String(Math.floor(t / 60)).padStart(2, "0")}:${String(t % 60).padStart(2, "0")}`;
    return {
      slotIndex: i,
      label: `${hhmm(start)} - ${hhmm(start + 30)}`,
      startTime: hhmm(start),
      endTime: hhmm(start + 30),
      startHour: Math.floor(start / 60),
    };
  });
  const gridArgs = {
    slots: gridSlots,
    programMode: "day" as const,
    maxDur: 5,
    weekdays: ["Monday"],
  };

  it("plots 1:00 PM – 2:30 PM", () => {
    const got = resolvePlotMeetings(draftAt("1:00 PM", "1.5"), gridArgs);
    expect(got.ok).toBe(true);
    if (!got.ok) return;
    const m = got.meetings[0]!;
    expect(formatPlotTimeRange(m.startSlotIndex, m.durationSlots, gridSlots)).toBe(
      "1:00 PM – 2:30 PM",
    );
  });

  /** The class the first one used to make impossible. */
  it("plots 2:30 PM – 4:00 PM right after it", () => {
    const got = resolvePlotMeetings(draftAt("2:30 PM", "1.5"), gridArgs);
    expect(got.ok).toBe(true);
    if (!got.ok) return;
    const m = got.meetings[0]!;
    expect(formatPlotTimeRange(m.startSlotIndex, m.durationSlots, gridSlots)).toBe(
      "2:30 PM – 4:00 PM",
    );
  });

  /** Back to back, not overlapping: the second starts on the row the first ends on. */
  it("leaves no row claimed by both", () => {
    const first = resolvePlotMeetings(draftAt("1:00 PM", "1.5"), gridArgs);
    const second = resolvePlotMeetings(draftAt("2:30 PM", "1.5"), gridArgs);
    expect(first.ok && second.ok).toBe(true);
    if (!first.ok || !second.ok) return;
    const a = first.meetings[0]!;
    const b = second.meetings[0]!;
    expect(a.startSlotIndex + a.durationSlots / 0.5).toBe(b.startSlotIndex);
  });

  it("refuses a quarter-hour start", () => {
    expect(resolvePlotMeetings(draftAt("2:15 PM", "1"), gridArgs).ok).toBe(false);
  });
});
