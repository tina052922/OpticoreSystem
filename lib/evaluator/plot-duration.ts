import { BSIT_PLOT_SLOTS } from "@/lib/chairman/bsit-evaluator-constants";
import type { ProspectusSubjectRow } from "@/lib/chairman/bsit-prospectus";
import { prospectusRowForProgram } from "@/lib/chairman/prospectus-registry";
import { weeklyContactHoursFromUnits } from "@/lib/subjects/contact-hours";
import type { Subject } from "@/types/db";

const MAX_CONSECUTIVE_PLOT_SLOTS = 10;

/**
 * Meetings are plotted in half-hour steps.
 *
 * The grid still draws one row per hour — a 1.5 hour class is shown as a card covering its own row
 * and half the next — but the duration itself is no longer whole hours. Classes that run 10:00 to
 * 11:30 are ordinary, and rounding them to one hour or two misstated both the timetable and the
 * teaching load computed from it.
 */
export const PLOT_STEP_HOURS = 0.5;

/**
 * Hours in one row of the evaluator grid.
 *
 * A row is a half hour, so a duration in hours and a count of rows are no longer the same number:
 * a 1.5 hour class covers three rows. Everything that reaches into a slot array has to convert.
 */
export const PLOT_SLOT_HOURS = 0.5;

/**
 * How long one row of a slot table is, in hours, read from the table itself.
 *
 * Taken from the data rather than assumed, because the evaluator's rows are half hours while the
 * printed forms' are whole ones, and a function handed the wrong pitch silently places classes an
 * hour out instead of failing.
 */
export function plotSlotHours(slots: { startTime: string; endTime: string }[]): number {
  const first = slots[0];
  if (!first) return PLOT_SLOT_HOURS;
  const toMin = (t: string) => {
    const [h, m] = t.split(":");
    return parseInt(h ?? "0", 10) * 60 + parseInt(m ?? "0", 10);
  };
  const span = toMin(first.endTime) - toMin(first.startTime);
  return span > 0 ? span / 60 : PLOT_SLOT_HOURS;
}

/** Rows a class of `hours` covers on a grid of the given pitch. */
export function plotRowsForHours(hours: number, slotHours = PLOT_SLOT_HOURS): number {
  const h = Math.max(PLOT_STEP_HOURS, quantizePlotHours(hours) || PLOT_STEP_HOURS);
  return Math.max(1, Math.ceil(h / (slotHours || PLOT_SLOT_HOURS)));
}

/** Nearest half hour. `Math.round` alone would quantise 1.5 away to 2. */
export function quantizePlotHours(hours: number): number {
  return Math.round(hours / PLOT_STEP_HOURS) * PLOT_STEP_HOURS;
}

function clampConsecutiveHours(hours: number): number {
  const stepped = quantizePlotHours(hours);
  return Math.min(MAX_CONSECUTIVE_PLOT_SLOTS, Math.max(PLOT_STEP_HOURS, stepped));
}

/**
 * Max consecutive 1-hour slots for one meeting.
 *
 * Recorded hours first, units only as a fallback — the same order as
 * `requiredWeeklyContactHours`, so the cap on one meeting and the term requirement cannot disagree.
 * Lecture: 1 unit = 1 hour. Laboratory: 1 unit = 3 hours.
 */
export function maxPlotDurationSlots(p: ProspectusSubjectRow): number {
  const fromHours = (p.lecHours ?? 0) + (p.labHours ?? 0);
  if (fromHours > 0) return clampConsecutiveHours(fromHours);
  const fromUnits = weeklyContactHoursFromUnits(p.lecUnits, p.labUnits);
  if (fromUnits > 0) return clampConsecutiveHours(fromUnits);
  return 1;
}

/** Hours actually plotted for a meeting (not clamped to prospectus). Used for over-limit totals. */
export function plottedDurationHours(durationSlots?: number | null): number {
  if (durationSlots == null || !Number.isFinite(Number(durationSlots))) return 1;
  return Math.max(PLOT_STEP_HOURS, quantizePlotHours(Number(durationSlots)));
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
    return Math.min(max, Math.max(PLOT_STEP_HOURS, quantizePlotHours(requested)));
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
  if (span > 0) {
    return Math.min(15, Math.max(PLOT_STEP_HOURS, quantizePlotHours(span / 60)));
  }
  return 1;
}

/** Max consecutive slots for a catalog subject (prospectus or DB lec hours). */
export function maxPlotDurationSlotsForSubject(
  programCode: string | null | undefined,
  subject: Subject | undefined,
): number {
  if (!subject?.code) return 1;
  // The subject's own hours win over the prospectus, which may be a stale hardcoded copy.
  const fromHours = (subject.lecHours ?? 0) + (subject.labHours ?? 0);
  if (fromHours > 0) return clampConsecutiveHours(fromHours);
  const fromUnits = weeklyContactHoursFromUnits(subject.lecUnits, subject.labUnits);
  if (fromUnits > 0) return clampConsecutiveHours(fromUnits);
  const row = prospectusRowForProgram(programCode, subject.code);
  if (row) return maxPlotDurationSlots(row);
  return 1;
}

/** Default 1 slot per meeting so GEC / chairman can split contact across rows. */
export function plotEntryDurationSlots(
  programCode: string | null | undefined,
  subject: Subject | undefined,
  durationSlots?: number,
): number {
  const max = maxPlotDurationSlotsForSubject(programCode, subject);
  if (durationSlots != null && Number.isFinite(durationSlots)) {
    return Math.min(max, Math.max(PLOT_STEP_HOURS, quantizePlotHours(durationSlots)));
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
  slots: { startTime: string; endTime: string }[],
): number {
  if (startSlotIndex < 0) return startSlotIndex;
  // Night 6:00 PM is index 11 on the 15-slot Night table. Never pull that
  // index onto a 10-slot Day table (which would land on 4:00 PM).
  if (startSlotIndex >= slots.length) return startSlotIndex;
  // Rows, not hours: on the evaluator's half-hour grid, 1.5 hours is three of them.
  const rows = plotRowsForHours(durationSlots, plotSlotHours(slots));
  const maxS = Math.max(0, slots.length - rows);
  return Math.min(startSlotIndex, maxS);
}

/**
 * Map grid start index + duration to `ScheduleEntry` times.
 *
 * The end is computed by adding the duration to the start rather than by reading the last slot's
 * `endTime`, which can only ever land on the hour — a 1.5 hour meeting has to end at :30.
 */
export function timesFromSlotRange(
  effectiveStart: number,
  dur: number,
  slots: { startTime: string; endTime: string }[] = BSIT_PLOT_SLOTS,
): { startTime: string; endTime: string } | null {
  const hours = Math.max(PLOT_STEP_HOURS, quantizePlotHours(dur) || PLOT_STEP_HOURS);
  const startIdx = clampPlotStartSlotIndex(effectiveStart, hours, slots);
  const startSlot = slots[startIdx];
  if (!startSlot) return null;

  const [h, m] = startSlot.startTime.split(":");
  const startMinutes = parseInt(h ?? "0", 10) * 60 + parseInt(m ?? "0", 10);
  if (!Number.isFinite(startMinutes)) return null;
  const endMinutes = startMinutes + Math.round(hours * 60);

  const hh = String(Math.floor(endMinutes / 60)).padStart(2, "0");
  const mm = String(endMinutes % 60).padStart(2, "0");
  return {
    startTime: padScheduleTime(startSlot.startTime),
    endTime: padScheduleTime(`${hh}:${mm}`),
  };
}
