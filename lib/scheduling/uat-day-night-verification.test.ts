/**
 * Evidence for the UAT cases that depend on Day / Night independence.
 * Each block name maps to a test case ID in docs/UAT_TEST_CASES.md.
 */
import { describe, expect, it } from "vitest";
import {
  detectConflictsForEntry,
  detectConflictsSparse,
  type SparseScheduleBlock,
} from "./conflicts";
import {
  DAY_ONE_HOUR_SLOTS,
  NIGHT_FULL_DAY_SLOTS,
  evaluatorSlotsForMode,
  evaluatorWeekdaysForMode,
  filterByProgramMode,
  isEvaluatorSlotPlottable,
  resolveProgramMode,
} from "./program-mode";
import type { ScheduleBlock } from "./types";
import { formatSparseConflictLines } from "@/lib/evaluator/plot-conflict-messages";
import { timesFromSlotRange } from "@/lib/evaluator/plot-duration";

const PERIOD = "period-1";
const ALBERCA = "user-alberca";

function block(over: Partial<ScheduleBlock> & { id: string }): ScheduleBlock {
  return {
    academicPeriodId: PERIOD,
    subjectId: "subj-it311",
    instructorId: ALBERCA,
    sectionId: "sec-bsit3a",
    roomId: "room-itlab1",
    day: "Monday",
    startTime: "16:00",
    endTime: "17:00",
    ...over,
  };
}

function sparse(over: Partial<SparseScheduleBlock> & { id: string }): SparseScheduleBlock {
  return {
    academicPeriodId: PERIOD,
    day: "Monday",
    startTime: "16:00",
    endTime: "17:00",
    instructorId: ALBERCA,
    sectionId: "sec-bsit3a",
    roomId: "room-itlab1",
    ...over,
  };
}

describe("TC002 — Day Program plotting stays inside the 7:00 AM – 5:00 PM window", () => {
  it("exposes ten hourly Day slots, Monday to Friday", () => {
    expect(evaluatorWeekdaysForMode("day")).toEqual([
      "Monday",
      "Tuesday",
      "Wednesday",
      "Thursday",
      "Friday",
    ]);
    expect(evaluatorSlotsForMode("day")).toHaveLength(10);
    expect(DAY_ONE_HOUR_SLOTS[0]?.startTime).toBe("07:00");
    expect(DAY_ONE_HOUR_SLOTS.at(-1)?.endTime).toBe("17:00");
  });

  it("places an 8:00 AM two-hour Day block at 8:00 AM – 10:00 AM", () => {
    const start = DAY_ONE_HOUR_SLOTS.findIndex((s) => s.startTime === "08:00");
    expect(timesFromSlotRange(start, 2, DAY_ONE_HOUR_SLOTS)).toEqual({
      startTime: "08:00:00",
      endTime: "10:00:00",
    });
  });
});

describe("TC003 — Night Program plotting keeps the exact selected slot", () => {
  it("keeps Monday 6:00 PM – 7:00 PM without sliding to 4:00 PM", () => {
    const start = NIGHT_FULL_DAY_SLOTS.findIndex((s) => s.startTime === "18:00");
    expect(timesFromSlotRange(start, 1, NIGHT_FULL_DAY_SLOTS)).toEqual({
      startTime: "18:00:00",
      endTime: "19:00:00",
    });
  });

  it("keeps a two-hour Tuesday block at 6:00 PM – 8:00 PM", () => {
    const start = NIGHT_FULL_DAY_SLOTS.findIndex((s) => s.startTime === "18:00");
    expect(timesFromSlotRange(start, 2, NIGHT_FULL_DAY_SLOTS)).toEqual({
      startTime: "18:00:00",
      endTime: "20:00:00",
    });
  });

  it("keeps a two-hour Saturday block at 7:00 AM – 9:00 AM", () => {
    const start = NIGHT_FULL_DAY_SLOTS.findIndex((s) => s.startTime === "07:00");
    expect(timesFromSlotRange(start, 2, NIGHT_FULL_DAY_SLOTS)).toEqual({
      startTime: "07:00:00",
      endTime: "09:00:00",
    });
  });

  it("allows Mon–Fri only from 4:00 PM to 10:00 PM and Sat–Sun from 7:00 AM to 10:00 PM", () => {
    const at = (hhmm: string) => NIGHT_FULL_DAY_SLOTS.find((s) => s.startTime === hhmm)!;

    expect(isEvaluatorSlotPlottable("night", "Monday", at("15:00"))).toBe(false);
    expect(isEvaluatorSlotPlottable("night", "Monday", at("16:00"))).toBe(true);
    expect(isEvaluatorSlotPlottable("night", "Monday", at("18:00"))).toBe(true);
    expect(isEvaluatorSlotPlottable("night", "Monday", at("21:00"))).toBe(true);

    expect(isEvaluatorSlotPlottable("night", "Saturday", at("07:00"))).toBe(true);
    expect(isEvaluatorSlotPlottable("night", "Sunday", at("07:00"))).toBe(true);
  });
});

describe("TC004 — Conflict Checker keeps Day and Night in separate universes", () => {
  const dayLoad = block({ id: "day-1", programMode: "day" });
  const nightLoad = block({ id: "night-1", programMode: "night", roomId: "room-itlab2" });

  it("reports no faculty conflict for the same instructor across Day and Night", () => {
    expect(detectConflictsForEntry(nightLoad, [dayLoad])).toEqual([]);
    expect(detectConflictsForEntry(dayLoad, [nightLoad])).toEqual([]);
  });

  it("reports no conflict across Day and Night on the sparse grid path", () => {
    const day = sparse({ id: "day-1", programMode: "day" });
    const night = sparse({ id: "night-1", programMode: "night", roomId: "room-itlab2" });
    expect(detectConflictsSparse(night, [day])).toEqual([]);
  });

  it("separates Day and Night even when Night is stored with the Night:: day prefix", () => {
    const day = sparse({ id: "day-1", day: "Monday" });
    const night = sparse({ id: "night-1", day: "Night::Monday", roomId: "room-itlab2" });
    expect(resolveProgramMode(night)).toBe("night");
    expect(resolveProgramMode(day)).toBe("day");
    expect(detectConflictsSparse(night, [day])).toEqual([]);
  });

  it("still detects a genuine double-booking inside the same program", () => {
    const first = sparse({ id: "night-1", programMode: "night" });
    const second = sparse({ id: "night-2", programMode: "night", sectionId: "sec-bsit3b", roomId: "room-itlab2" });
    const hits = detectConflictsSparse(second, [first]);
    expect(hits.map((h) => h.type)).toContain("faculty");
  });
});

describe("TC005 — Conflict messages use readable 12-hour ranges", () => {
  it("renders 4:00 PM – 5:00 PM instead of 16:00–17:00", () => {
    const other = sparse({ id: "night-1", day: "Night::Monday", programMode: "night" });
    const lines = formatSparseConflictLines(
      [{ type: "faculty", message: "", withEntryId: "night-1" }],
      [other],
      { instructorName: "Gwyneth Alberca" },
    );

    expect(lines).toHaveLength(1);
    expect(lines[0]).toBe(
      "Gwyneth Alberca is double-booked: overlaps another assignment on Monday 4:00 PM – 5:00 PM.",
    );
    expect(lines[0]).not.toContain("16:00");
    expect(lines[0]).not.toContain("Night::");
  });
});

describe("TC007 — Search and listings filter by the selected program", () => {
  const rows = [
    { id: "day-1", day: "Monday", startTime: "08:00", programMode: "day" },
    { id: "night-1", day: "Monday", startTime: "18:00", programMode: "night" },
    { id: "night-2", day: "Night::Tuesday" },
    { id: "legacy-day", day: "Wednesday", startTime: "09:00" },
    { id: "untagged-6pm", day: "Monday", startTime: "18:00" },
    { id: "tagged-night-4pm", day: "Monday", startTime: "16:00", programMode: "night" },
  ];

  it("returns Evening rows only when the Evening Program is selected", () => {
    expect(filterByProgramMode(rows, "night").map((r) => r.id)).toEqual([
      "night-1",
      "night-2",
      "untagged-6pm",
      "tagged-night-4pm",
    ]);
  });

  it("returns Day rows only when the Day Program is selected", () => {
    expect(filterByProgramMode(rows, "day").map((r) => r.id)).toEqual(["day-1", "legacy-day"]);
  });
});

describe("TC008 — Faculty load stays per program", () => {
  it("does not mix Day and Night hours for the same instructor", () => {
    const rows = [
      { id: "d", instructorId: "alberca", day: "Monday", startTime: "08:00", endTime: "10:00", programMode: "day" as const },
      { id: "n", instructorId: "alberca", day: "Monday", startTime: "18:00", endTime: "20:00", programMode: "night" as const },
    ];
    expect(filterByProgramMode(rows, "day")).toHaveLength(1);
    expect(filterByProgramMode(rows, "night")).toHaveLength(1);
  });

  it("infers untagged 6:00 PM as Night and keeps tagged Night 4:00 PM as Night", () => {
    expect(resolveProgramMode({ day: "Monday", startTime: "18:00" })).toBe("night");
    expect(resolveProgramMode({ day: "Monday", startTime: "16:00", programMode: "night" })).toBe("night");
    expect(resolveProgramMode({ day: "Monday", startTime: "16:00", programMode: "day" })).toBe("day");
  });
});
