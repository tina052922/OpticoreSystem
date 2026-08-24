import { BSIT_EVALUATOR_TIME_SLOTS } from "@/lib/chairman/bsit-evaluator-constants";
import { NIGHT_PROGRAM_SLOTS, type ProgramHourSlot } from "@/lib/scheduling/program-session";
import type { ProspectusSubjectRow } from "@/lib/chairman/bsit-prospectus";
import { prospectusRowForProgram } from "@/lib/chairman/prospectus-registry";
import type { Subject } from "@/types/db";

/** Max consecutive 1-hour slots allowed for one plotted meeting (prospectus weekly contact). */
export function maxPlotDurationSlots(p: ProspectusSubjectRow): number {
  if (p.labUnits > 0) return Math.min(10, Math.max(1, Math.round(p.labUnits)));
  if (p.lecHours > 0) return Math.min(10, Math.max(1, Math.round(p.lecHours)));
  return 1;
}

export type PlotDurationRow = { durationSlots?: number };

/**
 * Slots spanned by one plot row. Defaults to **1 hour** so chairmen can split lec/lab
 * contact across multiple non-contiguous meetings for the same subject code.
 */
export function plotRowDurationSlots(p: ProspectusSubjectRow | undefined, row?: PlotDurationRow): number {
  if (!p) return 1;
  const max = maxPlotDurationSlots(p);
  const requested = row?.durationSlots;
  if (requested != null && Number.isFinite(requested)) {
    return Math.min(max, Math.max(1, Math.round(requested)));
  }
  return 1;
}

/** Infer duration from saved `ScheduleEntry` start/end (HH:mm). */
export function inferDurationSlotsFromTimes(startTime: string, endTime: string): number {
  const hhmm = (t: string) => {
    const parts = t.trim().split(":");
    return `${(parts[0] ?? "00").padStart(2, "0")}:${(parts[1] ?? "00").padStart(2, "0")}`;
  };
  const startH = hhmm(startTime);
  const endH = hhmm(endTime);
  const slotTable = NIGHT_PROGRAM_SLOTS;
  const startIdx = slotTable.findIndex((s) => s.startTime === startH);
  if (startIdx < 0) return 1;
  let endIdx = slotTable.findIndex((s) => {
    const endLabel = s.label.split(" - ").pop()?.trim() ?? "";
    return endLabel === endH || s.endTime === endH;
  });
  if (endIdx < 0) {
    endIdx = slotTable.findIndex((s) => s.startTime === endH);
    if (endIdx > 0) endIdx -= 1;
  }
  if (endIdx < startIdx) return 1;
  return Math.min(10, Math.max(1, endIdx - startIdx + 1));
}

/** Max consecutive slots for a catalog subject (prospectus or DB lec hours). */
export function maxPlotDurationSlotsForSubject(
  programCode: string | null | undefined,
  subject: Subject | undefined,
): number {
  if (!subject?.code) return 1;
  const row = prospectusRowForProgram(programCode, subject.code);
  if (row) return maxPlotDurationSlots(row);
  return Math.min(10, Math.max(1, Math.round(subject.lecHours ?? 1)));
}

/** Default 1 slot per meeting so GEC / chairman can split contact across rows. */
export function plotEntryDurationSlots(
  programCode: string | null | undefined,
  subject: Subject | undefined,
  durationSlots?: number,
): number {
  const max = maxPlotDurationSlotsForSubject(programCode, subject);
  if (durationSlots != null && Number.isFinite(durationSlots)) {
    return Math.min(max, Math.max(1, Math.round(durationSlots)));
  }
  return 1;
}

export function padScheduleTime(t: string): string {
  return t.length <= 5 ? `${t}:00` : t;
}

/** Map grid start index + duration to `ScheduleEntry` times. */
export function timesFromSlotRange(
  effectiveStart: number,
  dur: number,
  slots: ProgramHourSlot[] = BSIT_EVALUATOR_TIME_SLOTS,
): { startTime: string; endTime: string } | null {
  const startSlot = slots[effectiveStart];
  const endSlot = slots[effectiveStart + dur - 1];
  if (!startSlot || !endSlot) return null;
  return {
    startTime: padScheduleTime(startSlot.startTime),
    endTime: padScheduleTime(endSlot.endTime),
  };
}
