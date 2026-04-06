import { detectConflictsForEntry } from "@/lib/scheduling/conflicts";
import type { ScheduleBlock } from "@/lib/scheduling/types";
import type { Room, ScheduleEntry } from "@/types/db";
import { entryToBlock } from "./conflict-check";

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
 */
export function suggestMitigationForScheduleChange(
  entry: ScheduleEntry,
  requestedDay: string,
  requestedStart: string,
  requestedEnd: string,
  allEntriesInCollege: ScheduleEntry[],
  rooms: Room[],
): SuggestedMitigation | null {
  const others = allEntriesInCollege.filter((e) => e.id !== entry.id);
  const otherBlocks = others.map((e) => entryToBlock(e));

  const base = entryToBlock(entry);
  const candidateBase: ScheduleBlock = {
    ...base,
    day: requestedDay,
    startTime: requestedStart,
    endTime: requestedEnd,
  };

  for (const room of rooms) {
    const candidate: ScheduleBlock = { ...candidateBase, roomId: room.id };
    const hits = detectConflictsForEntry(candidate, otherBlocks);
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
