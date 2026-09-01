import { describe, expect, it } from "vitest";
import {
  detectConflictsForEntry,
  detectConflictsSparse,
  intervalsOverlap,
  normalizeDayForConflict,
  scheduleEntryToSparseBlock,
  scanAllSparseScheduleConflicts,
} from "./conflicts";
import type { ScheduleEntry } from "@/types/db";
import type { ScheduleBlock } from "./types";

describe("normalizeDayForConflict", () => {
  it("maps abbreviations to canonical weekdays", () => {
    expect(normalizeDayForConflict("Mon")).toBe("Monday");
    expect(normalizeDayForConflict("thu")).toBe("Thursday");
  });
});

describe("intervalsOverlap", () => {
  it("treats Mon and Monday as the same day", () => {
    expect(intervalsOverlap("Mon", "7:00", "9:00", "Monday", "8:00", "10:00")).toBe(true);
  });
  it("returns false on different days", () => {
    expect(intervalsOverlap("Monday", "7:00", "9:00", "Tuesday", "7:00", "9:00")).toBe(false);
  });

  it("returns true when same day and ranges overlap", () => {
    expect(intervalsOverlap("Monday", "7:00", "9:00", "Monday", "8:00", "10:00")).toBe(true);
  });

  it("returns false when adjacent (end equals start)", () => {
    expect(intervalsOverlap("Monday", "7:00", "9:00", "Monday", "9:00", "11:00")).toBe(false);
  });
});

function block(partial: Partial<ScheduleBlock> & Pick<ScheduleBlock, "id">): ScheduleBlock {
  return {
    id: partial.id,
    academicPeriodId: partial.academicPeriodId ?? "ap1",
    subjectId: partial.subjectId ?? "s1",
    instructorId: partial.instructorId ?? "i1",
    sectionId: partial.sectionId ?? "sec1",
    roomId: partial.roomId ?? "r1",
    day: partial.day ?? "Monday",
    startTime: partial.startTime ?? "7:00",
    endTime: partial.endTime ?? "9:00",
    programMode: partial.programMode,
  };
}

describe("detectConflictsForEntry", () => {
  it("detects faculty double-booking", () => {
    const existing = block({
      id: "a",
      instructorId: "faculty-x",
      sectionId: "sec-a",
      roomId: "room-1",
    });
    const candidate = block({
      id: "b",
      instructorId: "faculty-x",
      sectionId: "sec-b",
      roomId: "room-2",
    });
    const hits = detectConflictsForEntry(candidate, [existing]);
    expect(hits.some((h) => h.type === "faculty")).toBe(true);
    expect(hits.some((h) => h.type === "section")).toBe(false);
    expect(hits.some((h) => h.type === "room")).toBe(false);
  });

  it("detects section conflict", () => {
    const existing = block({ id: "a", sectionId: "sec-same", instructorId: "i1" });
    const candidate = block({ id: "b", sectionId: "sec-same", instructorId: "i2", roomId: "r2" });
    const hits = detectConflictsForEntry(candidate, [existing]);
    expect(hits.some((h) => h.type === "section")).toBe(true);
  });

  it("ignores different academic periods", () => {
    const existing = block({ id: "a", academicPeriodId: "fall", instructorId: "faculty-x" });
    const candidate = block({
      id: "b",
      academicPeriodId: "spring",
      instructorId: "faculty-x",
    });
    expect(detectConflictsForEntry(candidate, [existing])).toHaveLength(0);
  });

  it("skips self when updating same id", () => {
    const same = block({ id: "same", instructorId: "faculty-x" });
    expect(detectConflictsForEntry(same, [same])).toHaveLength(0);
  });
});

describe("scheduleEntryToSparseBlock + scanAllSparseScheduleConflicts", () => {
  it("detects faculty overlap when end time was invalid (defaults to +1 hour)", () => {
    const base: ScheduleEntry = {
      id: "a",
      academicPeriodId: "ap1",
      subjectId: "s1",
      instructorId: "fac-1",
      sectionId: "sec-a",
      roomId: "r1",
      day: "Monday",
      startTime: "13:00:00",
      endTime: "13:00:00",
      status: "draft",
    };
    const other: ScheduleEntry = {
      ...base,
      id: "b",
      sectionId: "sec-b",
      roomId: "r2",
      startTime: "13:30:00",
      endTime: "14:30:00",
    };
    const blocks = [base, other]
      .map((e) => scheduleEntryToSparseBlock(e))
      .filter((b): b is NonNullable<typeof b> => b != null);
    const scan = scanAllSparseScheduleConflicts(blocks);
    expect(scan.conflictingEntryIds.has("a")).toBe(true);
    expect(scan.conflictingEntryIds.has("b")).toBe(true);
  });

  it("detects sparse faculty double-booking across partial rows", () => {
    const a = {
      id: "a",
      academicPeriodId: "ap1",
      day: "Monday",
      startTime: "12:00",
      endTime: "13:00",
      instructorId: "fac-1",
      sectionId: "sec-a",
      roomId: null,
    };
    const b = {
      id: "b",
      academicPeriodId: "ap1",
      day: "Monday",
      startTime: "12:30",
      endTime: "13:30",
      instructorId: "fac-1",
      sectionId: "sec-b",
      roomId: "r2",
    };
    const hits = detectConflictsSparse(a, [a, b]);
    expect(hits.some((h) => h.type === "faculty")).toBe(true);
  });

  it("does not treat Day 4:00–5:00 PM as a Night double-booking", () => {
    const dayBlock = {
      id: "day",
      academicPeriodId: "ap1",
      day: "Monday",
      startTime: "16:00",
      endTime: "17:00",
      instructorId: "fac-1",
      sectionId: "sec-a",
      roomId: "r1",
      programSession: "day" as const,
    };
    const nightBlock = {
      id: "night",
      academicPeriodId: "ap1",
      day: "Monday",
      startTime: "16:00",
      endTime: "17:00",
      instructorId: "fac-1",
      sectionId: "sec-b",
      roomId: "r2",
      programSession: "night" as const,
    };
    expect(detectConflictsSparse(dayBlock, [dayBlock, nightBlock])).toHaveLength(0);
    expect(detectConflictsSparse(nightBlock, [dayBlock, nightBlock])).toHaveLength(0);
  });
});

describe("Day vs Night program isolation", () => {
  it("does not treat Day 4:00–5:00 PM and Night 4:00–5:00 PM as a faculty double-booking", () => {
    const dayLoad = block({
      id: "day-gwyneth",
      instructorId: "gwyneth",
      sectionId: "sec-day",
      roomId: "r-day",
      day: "Monday",
      startTime: "16:00",
      endTime: "17:00",
      programMode: "day",
    });
    const nightLoad = block({
      id: "night-gwyneth",
      instructorId: "gwyneth",
      sectionId: "sec-night",
      roomId: "r-night",
      day: "Monday",
      startTime: "16:00",
      endTime: "17:00",
      programMode: "night",
    });
    expect(detectConflictsForEntry(nightLoad, [dayLoad])).toHaveLength(0);
    expect(detectConflictsForEntry(dayLoad, [nightLoad])).toHaveLength(0);
  });

  it("still flags two Evening Program meetings for the same instructor", () => {
    const a = block({
      id: "n1",
      instructorId: "gwyneth",
      sectionId: "sec-a",
      roomId: "r1",
      day: "Monday",
      startTime: "16:00",
      endTime: "17:00",
      programMode: "night",
    });
    const b = block({
      id: "n2",
      instructorId: "gwyneth",
      sectionId: "sec-b",
      roomId: "r2",
      day: "Monday",
      startTime: "16:00",
      endTime: "17:00",
      programMode: "night",
    });
    expect(detectConflictsForEntry(b, [a]).some((h) => h.type === "faculty")).toBe(true);
  });

  it("strips Night:: day prefix so Saturday night still matches Saturday", () => {
    expect(normalizeDayForConflict("Night::Monday")).toBe("Monday");
    expect(intervalsOverlap("Night::Saturday", "07:00", "08:00", "Saturday", "07:00", "08:00")).toBe(true);
  });
});
