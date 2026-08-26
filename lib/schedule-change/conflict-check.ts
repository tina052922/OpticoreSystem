import {
  detectConflictsSparse,
  hhmmForConflict,
  scheduleEntryToSparseBlock,
  type SparseScheduleBlock,
} from "@/lib/scheduling/conflicts";
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
    programMode: e.programMode ?? e.programSession ?? undefined,
  };
}

/**
 * Proposed move for one row vs the rest of the term.
 *
 * Uses **sparse** overlap rules ({@link detectConflictsSparse}) and normalized HH:MM — same semantics as the
 * Evaluator grid / {@link scanAllSparseScheduleConflicts}. Pass **all campus rows** for the term (typically via
 * service-role client) so RLS does not hide clashes.
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
  const effectiveRoom =
    roomIdOverride != null && String(roomIdOverride).trim() !== ""
      ? roomIdOverride
      : original.roomId;
  const candidate: SparseScheduleBlock = {
    id: original.id,
    academicPeriodId: original.academicPeriodId,
    day: requestedDay,
    startTime: hhmmForConflict(requestedStart),
    endTime: hhmmForConflict(requestedEnd),
    instructorId: original.instructorId?.trim() ? original.instructorId : null,
    sectionId: original.sectionId?.trim() ? original.sectionId : null,
    roomId: effectiveRoom?.trim() ? effectiveRoom : null,
    programMode: original.programMode ?? original.programSession ?? undefined,
  };

  const others: SparseScheduleBlock[] = [];
  for (const row of allEntriesInCollege) {
    if (row.id === original.id) continue;
    const b = scheduleEntryToSparseBlock(row);
    if (b) others.push(b);
  }

  const hits = detectConflictsSparse(candidate, others, original.id);
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
