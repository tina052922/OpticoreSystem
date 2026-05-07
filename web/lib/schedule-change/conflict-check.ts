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
 * Proposed move: same entry id at new day/time (and optionally a different room).
 * Universe = all other entries in the college for this period.
 */
export function checkConflictForProposedMove(
  original: ScheduleEntry,
  requestedDay: string,
  requestedStart: string,
  requestedEnd: string,
  allEntriesInCollege: ScheduleEntry[],
  /** When set, conflict scan uses this room on the candidate (e.g. admin-applied room alternative). */
  roomIdOverride?: string | null,
): { severity: ConflictSeverity; hits: ConflictHit[] } {
  const base = entryToBlock(original);
  const candidate: ScheduleBlock = {
    ...base,
    day: requestedDay,
    startTime: requestedStart,
    endTime: requestedEnd,
    ...(roomIdOverride != null && String(roomIdOverride).trim() !== "" ? { roomId: roomIdOverride } : {}),
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
