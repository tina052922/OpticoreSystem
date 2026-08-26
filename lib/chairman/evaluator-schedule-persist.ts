import { evaluatorTimeSlots, type BsitEvaluatorWeekday } from "@/lib/chairman/bsit-evaluator-constants";
import {
  normalizeProspectusCode,
  prospectusByCode,
} from "@/lib/chairman/bsit-prospectus";
import { inferDurationSlotsFromTimes, plotRowDurationSlots, clampPlotStartSlotIndex } from "@/lib/evaluator/plot-duration";
import { resolveProgramMode, type ProgramMode } from "@/lib/scheduling/program-mode";
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
  durationSlots?: number;
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
  programMode?: ProgramMode;
}): { entries: ScheduleEntry[] } | { error: string } {
  const { rows, academicPeriodId, programId, subjectsForProgram, programMode = "day" } = args;
  const slots = evaluatorTimeSlots(programMode);
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
    const dur = plotRowDurationSlots(p, row);
    const startIdx = clampPlotStartSlotIndex(row.startSlotIndex, dur, slots.length);
    const startSlot = slots[startIdx];
    const endSlot = slots[startIdx + dur - 1];
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
      programMode,
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
    const slots = evaluatorTimeSlots(resolveProgramMode(e));
    if (!slots.length) continue;
    const sub = args.subjectById.get(e.subjectId);
    if (!sub?.code) continue;
    const p = prospectusByCode(sub.code);
    if (!p) continue;
    const startH = hhmm(e.startTime);
    const startIdx = slots.findIndex((s) => s.startTime === startH);
    if (startIdx < 0) continue;
    const dur = inferDurationSlotsFromTimes(e.startTime, e.endTime);
    const clampedStart = clampPlotStartSlotIndex(startIdx, dur, slots.length);

    out.push({
      id: e.id,
      sectionId: e.sectionId,
      students: args.sectionStudentCount.get(e.sectionId) ?? "",
      subjectCode: sub.code,
      instructorId: e.instructorId,
      roomId: e.roomId,
      startSlotIndex: clampedStart,
      durationSlots: dur,
      day: e.day as BsitEvaluatorWeekday,
    });
  }
  return out;
}
