import type { ConflictHit, ScheduleBlock } from "./types";

function toMinutes(t: string): number {
  const [h, m] = t.split(":").map((x) => parseInt(x, 10));
  return h * 60 + (m || 0);
}

/** True if [s1,e1) overlaps [s2,e2) on the same calendar day. */
export function intervalsOverlap(
  day1: string,
  s1: string,
  e1: string,
  day2: string,
  s2: string,
  e2: string,
): boolean {
  if (day1 !== day2) return false;
  const a = toMinutes(s1);
  const b = toMinutes(e1);
  const c = toMinutes(s2);
  const d = toMinutes(e2);
  return a < d && c < b;
}

export function detectConflictsForEntry(
  candidate: ScheduleBlock,
  others: ScheduleBlock[],
  ignoreId?: string,
): ConflictHit[] {
  const hits: ConflictHit[] = [];
  for (const o of others) {
    if (o.id === candidate.id || o.id === ignoreId) continue;
    if (o.academicPeriodId !== candidate.academicPeriodId) continue;
    if (!intervalsOverlap(candidate.day, candidate.startTime, candidate.endTime, o.day, o.startTime, o.endTime))
      continue;

    if (o.instructorId === candidate.instructorId) {
      hits.push({
        type: "faculty",
        message: "Instructor double-booked at this time.",
        withEntryId: o.id,
      });
    }
    if (o.sectionId === candidate.sectionId) {
      hits.push({
        type: "section",
        message: "Section has another class at this time.",
        withEntryId: o.id,
      });
    }
    if (o.roomId === candidate.roomId) {
      hits.push({
        type: "room",
        message: "Room is occupied by another class at this time.",
        withEntryId: o.id,
      });
    }
  }
  return hits;
}

/** Time span + optional resources; null ids skip that conflict type (both sides must be non-null to compare). */
export type SparseScheduleBlock = {
  id: string;
  academicPeriodId: string;
  day: string;
  startTime: string;
  endTime: string;
  instructorId: string | null;
  sectionId: string | null;
  roomId: string | null;
};

/**
 * Real-time friendly: flags faculty / section / room only when both entries have that field set
 * and intervals overlap. Use when rows may be partially filled.
 */
export function detectConflictsSparse(
  candidate: SparseScheduleBlock,
  others: SparseScheduleBlock[],
  ignoreId?: string,
): ConflictHit[] {
  const hits: ConflictHit[] = [];
  for (const o of others) {
    if (o.id === candidate.id || o.id === ignoreId) continue;
    if (o.academicPeriodId !== candidate.academicPeriodId) continue;
    if (!intervalsOverlap(candidate.day, candidate.startTime, candidate.endTime, o.day, o.startTime, o.endTime))
      continue;

    if (
      candidate.instructorId &&
      o.instructorId &&
      candidate.instructorId === o.instructorId
    ) {
      hits.push({
        type: "faculty",
        message: "Instructor double-booked at this time.",
        withEntryId: o.id,
      });
    }
    if (candidate.sectionId && o.sectionId && candidate.sectionId === o.sectionId) {
      hits.push({
        type: "section",
        message: "Section has another class at this time.",
        withEntryId: o.id,
      });
    }
    if (candidate.roomId && o.roomId && candidate.roomId === o.roomId) {
      hits.push({
        type: "room",
        message: "Room is occupied by another class at this time.",
        withEntryId: o.id,
      });
    }
  }
  return hits;
}

export function uniqueConflictTypes(hits: ConflictHit[]): Set<string> {
  return new Set(hits.map((h) => h.type));
}
