import { describe, expect, it } from "vitest";
import { evaluatorTimeSlots } from "@/lib/chairman/bsit-evaluator-constants";
import { plotStartConflicts } from "./plot-start-conflicts";
import type { SparseScheduleBlock } from "@/lib/scheduling/conflicts";

const slots = evaluatorTimeSlots("day");
const idx = (hhmm: string) => slots.findIndex((s) => s.startTime === hhmm);

const plotted: SparseScheduleBlock[] = [
  {
    id: "e-cc111",
    academicPeriodId: "ap",
    day: "Monday",
    startTime: "13:00",
    endTime: "14:30",
    instructorId: "u-other",
    sectionId: "sec-1a",
    roomId: "room-1",
    programMode: "day",
  },
];
const base = { id: "new", academicPeriodId: "ap", sectionId: "sec-1a", instructorId: "u-me", roomId: "room-9" };
const label = (id: string) => (id === "e-cc111" ? "CC-111 · BSIT 1A" : undefined);

describe("plotStartConflicts", () => {
  it("names the subject already plotted at that time in the section", () => {
    const msgs = plotStartConflicts({
      meetings: [{ day: "Monday", startSlotIndex: idx("13:30"), durationSlots: 1 }],
      base,
      slots,
      programMode: "day",
      existingBlocks: plotted,
      labelForEntry: label,
    });
    expect(msgs).toHaveLength(1);
    expect(msgs[0]).toContain("CC-111 · BSIT 1A");
    expect(msgs[0]).toContain("in this section");
  });

  it("checks every day separately — a free day passes", () => {
    const msgs = plotStartConflicts({
      meetings: [
        { day: "Monday", startSlotIndex: idx("15:00"), durationSlots: 1 },
        { day: "Wednesday", startSlotIndex: idx("13:30"), durationSlots: 1 },
      ],
      base,
      slots,
      programMode: "day",
      existingBlocks: plotted,
      labelForEntry: label,
    });
    expect(msgs).toEqual([]);
  });

  it("one line when the same class clashes for the section and the instructor", () => {
    const msgs = plotStartConflicts({
      meetings: [{ day: "Monday", startSlotIndex: idx("13:30"), durationSlots: 1 }],
      base: { ...base, instructorId: "u-other" },
      slots,
      programMode: "day",
      existingBlocks: plotted,
      labelForEntry: label,
    });
    expect(msgs).toHaveLength(1);
    expect(msgs[0]).toContain("already plotted in this section and for this instructor.");
  });
});
