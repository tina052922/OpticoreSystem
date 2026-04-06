import { detectConflictsForEntry } from "@/lib/scheduling/conflicts";
import type { ConflictHit } from "@/lib/scheduling/types";
import type { ScheduleBlock } from "@/lib/scheduling/types";
import type { ScheduleEntry } from "@/types/db";

export type ConflictSeverity = "none" | "small" | "large";

/** Map DB rows to scheduling blocks for the conflict engine. */
export function entryToBlock(e: ScheduleEntry): ScheduleBlock {
  return {
    id: e.id,
    academicPeriodId: e.academicPeriodId,
    subjectId: e.subjectId,
    instructorId: e.instructorId,
    sectionId: e.sectionId,
    roomId: e.roomId,
    day: e.day,
    startTime: e.startTime,
    endTime: e.endTime,
  };
}

/**
 * Proposed move: same entry id at new day/time. Universe = all other entries in the college for this period.
 */
export function checkConflictForProposedMove(
  original: ScheduleEntry,
  requestedDay: string,
  requestedStart: string,
  requestedEnd: string,
  allEntriesInCollege: ScheduleEntry[],
): { severity: ConflictSeverity; hits: ConflictHit[] } {
  const candidate: ScheduleBlock = {
    ...entryToBlock(original),
    day: requestedDay,
    startTime: requestedStart,
    endTime: requestedEnd,
  };

  const others: ScheduleBlock[] = allEntriesInCollege
    .filter((e) => e.id !== original.id)
    .map(entryToBlock);

  const hits = detectConflictsForEntry(candidate, others);
  const severity = classifyConflictSeverity(hits);
  return { severity, hits };
}

export function classifyConflictSeverity(hits: ConflictHit[]): ConflictSeverity {
  if (hits.length === 0) return "none";
  const hasFacultyOrSection = hits.some((h) => h.type === "faculty" || h.type === "section");
  if (hasFacultyOrSection) return "large";
  if (hits.length <= 2) return "small";
  return "large";
}
