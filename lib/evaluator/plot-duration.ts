import { BSIT_EVALUATOR_TIME_SLOTS } from "@/lib/chairman/bsit-evaluator-constants";
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

/** Infer duration from saved `ScheduleEntry` start/end (HH:mm). Works for Day and Night windows. */
export function inferDurationSlotsFromTimes(startTime: string, endTime: string): number {
  const toMin = (t: string) => {
    const parts = t.trim().split(":");
    const h = parseInt(parts[0] ?? "0", 10);
    const m = parseInt(parts[1] ?? "0", 10);
    if (!Number.isFinite(h) || !Number.isFinite(m)) return 0;
    return h * 60 + m;
  };
  const span = toMin(endTime) - toMin(startTime);
  if (span > 0) return Math.min(15, Math.max(1, Math.round(span / 60)));
  return 1;
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

/**
 * Keep the selected start cell. Never slide a Night 6:00 PM plot back onto the
 * Day grid’s last slot (4:00 PM) just because duration no longer fits a 10-row day table.
 */
export function clampPlotStartSlotIndex(
  startSlotIndex: number,
  durationSlots: number,
  slotCount: number,
): number {
  if (startSlotIndex < 0) return startSlotIndex;
  // Night 6:00 PM is index 11 on the 15-slot Night table. Never pull that
  // index onto a 10-slot Day table (which would land on 4:00 PM).
  if (startSlotIndex >= slotCount) return startSlotIndex;
  const dur = Math.max(1, Math.round(durationSlots) || 1);
  const maxS = Math.max(0, slotCount - dur);
  return Math.min(startSlotIndex, maxS);
}

/** Map grid start index + duration to `ScheduleEntry` times. */
export function timesFromSlotRange(
  effectiveStart: number,
  dur: number,
  slots: { startTime: string; endTime: string }[] = BSIT_EVALUATOR_TIME_SLOTS,
): { startTime: string; endTime: string } | null {
  const startIdx = clampPlotStartSlotIndex(effectiveStart, dur, slots.length);
  const startSlot = slots[startIdx];
  const endSlot = slots[startIdx + dur - 1];
  if (!startSlot || !endSlot) return null;
  return {
    startTime: padScheduleTime(startSlot.startTime),
    endTime: padScheduleTime(endSlot.endTime),
  };
}
