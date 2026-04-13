import { BSIT_EVALUATOR_TIME_SLOTS, type BsitEvaluatorWeekday } from "@/lib/chairman/bsit-evaluator-constants";
import {
  normalizeProspectusCode,
  prospectusByCode,
  scheduleDurationSlots,
} from "@/lib/chairman/bsit-prospectus";
import type { ScheduleEntry, Subject } from "@/types/db";

/** Minimal row shape shared with `BsitChairmanEvaluatorWorksheet` for DB round-trip. */
export type ChairmanPersistablePlotRow = {
  id: string;
  sectionId: string;
  students: number | "";
  subjectCode: string;
  instructorId: string;
  roomId: string;
  startSlotIndex: number;
  day: BsitEvaluatorWeekday;
};

/** Normalize DB time strings like `07:00:00` to `07:00` for slot matching. */
function hhmm(t: string): string {
  const parts = t.trim().split(":");
  const h = parts[0] ?? "00";
  const m = parts[1] ?? "00";
  return `${h.padStart(2, "0")}:${m.padStart(2, "0")}`;
}

/**
 * Maps plotted BSIT rows to `ScheduleEntry` rows for Supabase upsert.
 * Returns an error if a subject code has no matching `Subject` row for this program.
 */
export function plotRowsToScheduleEntries(args: {
  rows: ChairmanPersistablePlotRow[];
  academicPeriodId: string;
  programId: string;
  subjectsForProgram: Subject[];
}): { entries: ScheduleEntry[] } | { error: string } {
  const { rows, academicPeriodId, programId, subjectsForProgram } = args;
  const codeToSubjectId = new Map<string, string>();
  for (const s of subjectsForProgram) {
    if (s.programId !== programId) continue;
    codeToSubjectId.set(normalizeProspectusCode(s.code), s.id);
  }

  const entries: ScheduleEntry[] = [];

  for (const row of rows) {
    if (!row.sectionId || !row.subjectCode || !row.instructorId || !row.roomId) continue;
    const p = prospectusByCode(row.subjectCode);
    if (!p) continue;
    const dur = scheduleDurationSlots(p);
    const maxS = BSIT_EVALUATOR_TIME_SLOTS.length - dur;
    const startIdx = Math.min(row.startSlotIndex, maxS);
    const startSlot = BSIT_EVALUATOR_TIME_SLOTS[startIdx];
    const endSlot = BSIT_EVALUATOR_TIME_SLOTS[startIdx + dur - 1];
    if (!startSlot || !endSlot) continue;

    const norm = normalizeProspectusCode(row.subjectCode);
    const subjectId = codeToSubjectId.get(norm);
    if (!subjectId) {
      return {
        error: `No database subject for code "${row.subjectCode}" in this program. Sync Subject catalog or fix the code.`,
      };
    }

    entries.push({
      id: row.id,
      academicPeriodId,
      subjectId,
      instructorId: row.instructorId,
      sectionId: row.sectionId,
      roomId: row.roomId,
      day: row.day,
      startTime: startSlot.startTime,
      endTime: endSlot.endTime,
      status: "draft",
    });
  }

  return { entries };
}

/** Rehydrate plot rows from saved `ScheduleEntry` rows for the Chairman BSIT grid. */
export function scheduleEntriesToPlotRows(args: {
  entries: ScheduleEntry[];
  subjectById: Map<string, Subject>;
  sectionStudentCount: Map<string, number>;
}): ChairmanPersistablePlotRow[] {
  const out: ChairmanPersistablePlotRow[] = [];
  for (const e of args.entries) {
    if (!BSIT_EVALUATOR_TIME_SLOTS.length) continue;
    const sub = args.subjectById.get(e.subjectId);
    if (!sub?.code) continue;
    const p = prospectusByCode(sub.code);
    if (!p) continue;
    const dur = scheduleDurationSlots(p);
    const startH = hhmm(e.startTime);
    const startIdx = BSIT_EVALUATOR_TIME_SLOTS.findIndex((s) => s.startTime === startH);
    if (startIdx < 0) continue;
    const maxS = BSIT_EVALUATOR_TIME_SLOTS.length - dur;
    const clampedStart = Math.min(startIdx, Math.max(0, maxS));

    out.push({
      id: e.id,
      sectionId: e.sectionId,
      students: args.sectionStudentCount.get(e.sectionId) ?? "",
      subjectCode: sub.code,
      instructorId: e.instructorId,
      roomId: e.roomId,
      startSlotIndex: clampedStart,
      day: e.day as BsitEvaluatorWeekday,
    });
  }
  return out;
}
