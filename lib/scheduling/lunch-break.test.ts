import { describe, expect, it } from "vitest";
import {
  DAY_PLOT_SLOTS,
  NIGHT_PLOT_SLOTS,
  isEvaluatorSlotPlottable,
  overlapsLunchBreak,
} from "./program-mode";
import { resolvePlotMeetings } from "@/lib/evaluator/plot-meetings";
import { runRuleBasedGeneticAlgorithm } from "./ruleBasedGA";

const at = (slots: typeof DAY_PLOT_SLOTS, hhmm: string) => slots.find((s) => s.startTime === hhmm)!;
const weekdays = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"];

describe("lunch break 12:00–1:00 PM", () => {
  it("detects overlap with the break", () => {
    expect(overlapsLunchBreak("11:00", "12:30")).toBe(true);
    expect(overlapsLunchBreak("12:30", "13:30")).toBe(true);
    expect(overlapsLunchBreak("11:00", "12:00")).toBe(false);
    expect(overlapsLunchBreak("13:00", "14:30")).toBe(false);
  });

  it("makes the 12:00 and 12:30 rows unplottable", () => {
    expect(isEvaluatorSlotPlottable("day", "Monday", at(DAY_PLOT_SLOTS, "12:00"))).toBe(false);
    expect(isEvaluatorSlotPlottable("day", "Monday", at(DAY_PLOT_SLOTS, "12:30"))).toBe(false);
    expect(isEvaluatorSlotPlottable("day", "Monday", at(DAY_PLOT_SLOTS, "11:30"))).toBe(true);
    expect(isEvaluatorSlotPlottable("day", "Monday", at(DAY_PLOT_SLOTS, "13:00"))).toBe(true);
    expect(isEvaluatorSlotPlottable("night", "Saturday", at(NIGHT_PLOT_SLOTS, "12:00"))).toBe(false);
  });

  const args = { slots: DAY_PLOT_SLOTS, programMode: "day" as const, maxDur: 3, weekdays };
  const plot = (time: string, hrs: string) =>
    resolvePlotMeetings({ timeText: time, slots: [{ day: "Monday", durationHours: hrs }] }, args);

  it("refuses a meeting that starts at or runs into lunch", () => {
    expect(plot("12:00 PM", "1").ok).toBe(false);
    expect(plot("11:00 AM", "1.5").ok).toBe(false);
    expect(plot("11:30 AM", "1").ok).toBe(false);
  });

  it("allows meetings that end at 12:00 or start at 1:00", () => {
    expect(plot("11:00 AM", "1").ok).toBe(true);
    expect(plot("10:30 AM", "1.5").ok).toBe(true);
    expect(plot("1:00 PM", "1.5").ok).toBe(true);
  });

  it("never suggests an alternative over lunch", () => {
    const sug = runRuleBasedGeneticAlgorithm({
      universe: [],
      sectionId: "s",
      subjectId: "x",
      academicPeriodId: "p",
      durationHours: 2,
      roomIds: ["r1"],
      instructorIds: ["i1"],
    });
    expect(sug.length).toBeGreaterThan(0);
    for (const s of sug) expect(overlapsLunchBreak(s.startTime, s.endTime)).toBe(false);
  });
});
