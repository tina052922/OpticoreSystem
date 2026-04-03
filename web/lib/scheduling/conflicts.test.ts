import { describe, expect, it } from "vitest";
import { detectConflictsForEntry, intervalsOverlap } from "./conflicts";
import type { ScheduleBlock } from "./types";

describe("intervalsOverlap", () => {
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
