import {
  detectConflictsSparse,
  hhmmForConflict,
  scheduleEntryToSparseBlock,
  type SparseScheduleBlock,
} from "@/lib/scheduling/conflicts";
import type { Room, ScheduleEntry } from "@/types/db";

export type SuggestedMitigation = {
  roomId: string;
  roomCode?: string;
  day: string;
  startTime: string;
  endTime: string;
  label: string;
};

/**
 * If the proposed slot only fails on room (or has small room issues), try another room in the college
 * at the same day/time. First conflict-free room wins.
 *
 * Uses sparse overlap rules (aligned with Evaluator / INS grids).
 */
export function suggestMitigationForScheduleChange(
  entry: ScheduleEntry,
  requestedDay: string,
  requestedStart: string,
  requestedEnd: string,
  allEntriesInCollege: ScheduleEntry[],
  rooms: Room[],
): SuggestedMitigation | null {
  const othersSparse: SparseScheduleBlock[] = [];
  for (const row of allEntriesInCollege) {
    if (row.id === entry.id) continue;
    const b = scheduleEntryToSparseBlock(row);
    if (b) othersSparse.push(b);
  }

  const startNorm = hhmmForConflict(requestedStart);
  const endNorm = hhmmForConflict(requestedEnd);

  for (const room of rooms) {
    const candidate: SparseScheduleBlock = {
      id: entry.id,
      academicPeriodId: entry.academicPeriodId,
      day: requestedDay,
      startTime: startNorm,
      endTime: endNorm,
      instructorId: entry.instructorId?.trim() ? entry.instructorId : null,
      sectionId: entry.sectionId?.trim() ? entry.sectionId : null,
      roomId: room.id,
    };
    const hits = detectConflictsSparse(candidate, othersSparse, entry.id);
    if (hits.length === 0) {
      return {
        roomId: room.id,
        roomCode: room.code,
        day: requestedDay,
        startTime: requestedStart,
        endTime: requestedEnd,
        label: `Try ${room.code} — no overlaps at ${requestedDay} ${requestedStart}–${requestedEnd}.`,
      };
    }
  }

  return null;
}
