import { describe, expect, it } from "vitest";
import { DAY_ONE_HOUR_SLOTS, NIGHT_FULL_DAY_SLOTS } from "@/lib/scheduling/program-mode";
import { parseTypedPlotTime, slotIndexFromTypedTime } from "./plot-time-input";
import { resolvePlotMeetings, seedPlotMeetingsDraft } from "./plot-meetings";

describe("parseTypedPlotTime", () => {
  it("parses 12-hour and 24-hour hourly starts", () => {
    expect(parseTypedPlotTime("8:00 AM")).toEqual({ hour: 8, minute: 0, unambiguous: true });
    expect(parseTypedPlotTime("8am")).toEqual({ hour: 8, minute: 0, unambiguous: true });
    expect(parseTypedPlotTime("8:00 PM")).toEqual({ hour: 20, minute: 0, unambiguous: true });
    expect(parseTypedPlotTime("16:00")).toEqual({ hour: 16, minute: 0, unambiguous: true });
    expect(parseTypedPlotTime("08:00")).toEqual({ hour: 8, minute: 0, unambiguous: true });
    expect(parseTypedPlotTime("8")).toEqual({ hour: 8, minute: 0, unambiguous: false });
  });

  it("rejects non-hourly times", () => {
    expect(parseTypedPlotTime("8:30 AM")).toBeNull();
    expect(parseTypedPlotTime("")).toBeNull();
    expect(parseTypedPlotTime("noon")).toBeNull();
  });
});

describe("slotIndexFromTypedTime", () => {
  it("maps 8:00 AM onto the Day grid", () => {
    expect(slotIndexFromTypedTime("8:00 AM", DAY_ONE_HOUR_SLOTS, "Monday", "day")).toBe(1);
    expect(slotIndexFromTypedTime("8", DAY_ONE_HOUR_SLOTS, "Monday", "day")).toBe(1);
  });

  it("maps hour-only 8 onto Night Monday 8:00 PM", () => {
    expect(slotIndexFromTypedTime("8", NIGHT_FULL_DAY_SLOTS, "Monday", "night")).toBe(13);
    expect(slotIndexFromTypedTime("8:00 PM", NIGHT_FULL_DAY_SLOTS, "Monday", "night")).toBe(13);
  });

  it("rejects ambiguous 8 on Night Saturday without AM/PM", () => {
    expect(slotIndexFromTypedTime("8", NIGHT_FULL_DAY_SLOTS, "Saturday", "night")).toBeNull();
    expect(slotIndexFromTypedTime("8:00 AM", NIGHT_FULL_DAY_SLOTS, "Saturday", "night")).toBe(1);
  });

  it("rejects a Day-window time on Night Monday", () => {
    expect(slotIndexFromTypedTime("8:00 AM", NIGHT_FULL_DAY_SLOTS, "Monday", "night")).toBeNull();
  });
});

describe("resolvePlotMeetings", () => {
  const weekdays = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"];

  it("seeds the clicked cell into meeting 1", () => {
    const seeded = seedPlotMeetingsDraft({
      day: "Monday",
      startSlotIndex: 1,
      durationSlots: 1,
      slots: DAY_ONE_HOUR_SLOTS,
    });
    expect(seeded.timeText).toBe("8:00 AM");
    expect(seeded.slots[0]?.day).toBe("Monday");
    expect(seeded.slots[0]?.durationHours).toBe("1");
  });

  it("creates three meetings from one typed time", () => {
    const result = resolvePlotMeetings(
      {
        timeText: "8:00 AM",
        slots: [
          { day: "Monday", durationHours: "1" },
          { day: "Wednesday", durationHours: "1" },
          { day: "Friday", durationHours: "2" },
        ],
      },
      { slots: DAY_ONE_HOUR_SLOTS, programMode: "day", maxDur: 3, weekdays },
    );
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.meetings).toEqual([
      { day: "Monday", startSlotIndex: 1, durationSlots: 1 },
      { day: "Wednesday", startSlotIndex: 1, durationSlots: 1 },
      { day: "Friday", startSlotIndex: 1, durationSlots: 2 },
    ]);
  });

  it("skips empty extra days", () => {
    const result = resolvePlotMeetings(
      {
        timeText: "7:00 AM",
        slots: [
          { day: "Tuesday", durationHours: "1" },
          { day: "", durationHours: "" },
          { day: "", durationHours: "" },
        ],
      },
      { slots: DAY_ONE_HOUR_SLOTS, programMode: "day", maxDur: 3, weekdays },
    );
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.meetings).toHaveLength(1);
    expect(result.meetings[0]?.day).toBe("Tuesday");
  });

  it("rejects a duplicate day", () => {
    const result = resolvePlotMeetings(
      {
        timeText: "8:00 AM",
        slots: [
          { day: "Monday", durationHours: "1" },
          { day: "Monday", durationHours: "1" },
          { day: "", durationHours: "" },
        ],
      },
      { slots: DAY_ONE_HOUR_SLOTS, programMode: "day", maxDur: 3, weekdays },
    );
    expect(result.ok).toBe(false);
  });
});
