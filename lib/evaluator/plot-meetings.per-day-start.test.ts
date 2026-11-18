import { describe, expect, it } from "vitest";
import { evaluatorTimeSlots } from "@/lib/chairman/bsit-evaluator-constants";
import { emptyPlotMeetingsDraft, meetingStartText, resolvePlotMeetings } from "./plot-meetings";

describe("per-day start times", () => {
  const slots = evaluatorTimeSlots("day");
  const days = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"] as const;

  it("uses each day's own start, and Day 1's when left empty", () => {
    const draft = emptyPlotMeetingsDraft();
    draft.timeText = "8:00 AM";
    draft.slots[0] = { day: "Monday", durationHours: "1.5", timeText: "" };
    draft.slots[1] = { day: "Wednesday", durationHours: "2", timeText: "1:00 PM" };
    draft.slots[2] = { day: "Friday", durationHours: "1", timeText: "" };
    expect(meetingStartText(draft, 1)).toBe("1:00 PM");
    expect(meetingStartText(draft, 2)).toBe("8:00 AM");

    const r = resolvePlotMeetings(draft, { slots, programMode: "day", maxDur: 10, weekdays: days });
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    const startOf = (i: number) => slots[r.meetings[i]!.startSlotIndex]!.startTime;
    expect(startOf(0)).toBe("08:00");
    expect(startOf(1)).toBe("13:00");
    expect(startOf(2)).toBe("08:00");
    expect(r.meetings.map((m) => m.durationSlots)).toEqual([1.5, 2, 1]);
  });
});
