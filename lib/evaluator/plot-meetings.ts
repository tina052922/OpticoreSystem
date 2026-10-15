import type { BsitEvaluatorWeekday } from "@/lib/chairman/bsit-evaluator-constants";
import type { HourSlot, ProgramMode } from "@/lib/scheduling/program-mode";
import { formatSlotStartForInput, slotIndexFromTypedTime } from "@/lib/evaluator/plot-time-input";
import {
  PLOT_STEP_HOURS,
  plotRowsForHours,
  plotSlotHours,
  quantizePlotHours,
} from "@/lib/evaluator/plot-duration";

export const PLOT_MEETING_SLOT_COUNT = 3;

export type PlotMeetingSlotFields = {
  day: string;
  durationHours: string;
};

export type PlotMeetingsDraft = {
  timeText: string;
  slots: PlotMeetingSlotFields[];
};

export type ResolvedPlotMeeting = {
  day: BsitEvaluatorWeekday;
  startSlotIndex: number;
  durationSlots: number;
};

export function emptyPlotMeetingSlot(): PlotMeetingSlotFields {
  return { day: "", durationHours: "" };
}

/**
 * Slot text as a trimmed string.
 *
 * The fields are typed `string`, but a draft is seeded from a `ScheduleEntry`, and a vacant or
 * freshly created row can carry no `day` at all. That `undefined` reached `slot.day.trim()` and threw
 * "Cannot read properties of undefined (reading 'trim')", taking the whole plot modal down.
 */
function text(value: string | null | undefined): string {
  return typeof value === "string" ? value.trim() : "";
}

/** One slot of a draft, tolerant of a missing entry in the array. */
function slotText(slot: PlotMeetingSlotFields | undefined): { day: string; durationHours: string } {
  return { day: text(slot?.day), durationHours: text(slot?.durationHours) };
}

/** Half-hour duration choices up to a subject's budget, for the Duration dropdown. */
export function plotDurationChoices(maxDur: number): number[] {
  const top = Math.max(PLOT_STEP_HOURS, quantizePlotHours(maxDur) || PLOT_STEP_HOURS);
  const out: number[] = [];
  for (let h = PLOT_STEP_HOURS; h <= top + 1e-9; h += PLOT_STEP_HOURS) {
    out.push(Number(h.toFixed(1)));
  }
  return out;
}

/** "1.5" rather than "1.5000000002", and "2" rather than "2.0". */
export function formatPlotDurationHours(hours: number): string {
  return Number.isInteger(hours) ? String(hours) : hours.toFixed(1);
}

/**
 * When Day is cleared, Hours must clear too (never keep a leftover default like "1").
 * When Day is newly selected and Hours is empty, default to 1 hour for convenience.
 */
export function durationHoursAfterDayChange(
  day: string | null | undefined,
  currentDurationHours: string | null | undefined,
): string {
  if (!text(day)) return "";
  if (!text(currentDurationHours)) return "1";
  return currentDurationHours as string;
}

export function emptyPlotMeetingsDraft(): PlotMeetingsDraft {
  return {
    timeText: "",
    slots: Array.from({ length: PLOT_MEETING_SLOT_COUNT }, () => emptyPlotMeetingSlot()),
  };
}

export function seedPlotMeetingsDraft(args: {
  /** May be absent: a vacant or brand-new row has no day yet. */
  day: string | null | undefined;
  startSlotIndex: number;
  durationSlots?: number;
  slots: HourSlot[];
}): PlotMeetingsDraft {
  const draft = emptyPlotMeetingsDraft();
  const first = draft.slots[0];
  if (!first) return draft;
  const day = text(args.day);
  first.day = day;
  // No day means nothing is plotted yet, so it must not carry a duration either.
  /*
   * Reopening a plotted meeting must show the duration it was saved with. Rounding to whole hours
   * here turned every 1.5 hour class into 2 the moment its modal was opened.
   */
  first.durationHours = day
    ? formatPlotDurationHours(Math.max(PLOT_STEP_HOURS, quantizePlotHours(args.durationSlots ?? 1)))
    : "";
  const startIndex = Number.isFinite(args.startSlotIndex) ? args.startSlotIndex : -1;
  draft.timeText =
    startIndex >= 0 ? formatSlotStartForInput(args.slots[startIndex]) : "";
  return draft;
}

function parseDurationHours(raw: string | null | undefined, maxDur: number): number | null {
  const n = parseFloat(text(raw));
  if (!Number.isFinite(n)) return null;
  // Snapped to the half hour, not the hour: a 1.5 hour class is ordinary, not a typo.
  const stepped = quantizePlotHours(n);
  if (stepped < PLOT_STEP_HOURS || stepped > maxDur + 1e-9) return null;
  return stepped;
}

export function filledPlotMeetingCount(draft: PlotMeetingsDraft): number {
  return (draft?.slots ?? []).filter((s) => slotText(s).day).length;
}

export function totalPlotMeetingHours(draft: PlotMeetingsDraft, maxDur: number): number {
  let sum = 0;
  for (const slot of draft?.slots ?? []) {
    const { day, durationHours } = slotText(slot);
    if (!day) continue;
    const d = parseDurationHours(durationHours, maxDur);
    if (d != null) sum += d;
  }
  return sum;
}

export type ResolvePlotMeetingsResult =
  | { ok: true; meetings: ResolvedPlotMeeting[] }
  | { ok: false; error: string };

export function resolvePlotMeetings(
  draft: PlotMeetingsDraft,
  args: {
    slots: HourSlot[];
    programMode: ProgramMode;
    maxDur: number;
    weekdays: readonly string[];
  },
): ResolvePlotMeetingsResult {
  const timeText = text(draft?.timeText);
  if (!timeText) {
    return { ok: false, error: "Type a start time (for example 8:00 AM)." };
  }

  const meetings: ResolvedPlotMeeting[] = [];
  const seenDays = new Set<string>();

  const slotList = draft?.slots ?? [];
  for (let i = 0; i < slotList.length; i++) {
    const { day, durationHours: durRaw } = slotText(slotList[i]);
    const hasAny = Boolean(day || durRaw);
    if (!hasAny) continue;

    if (!day) {
      return { ok: false, error: `Choose a day for meeting ${i + 1}, or clear its duration.` };
    }
    if (!args.weekdays.includes(day)) {
      return { ok: false, error: `"${day}" is not a valid day for this program.` };
    }
    if (seenDays.has(day)) {
      return { ok: false, error: `${day} is already used. Pick a different day, or clear the extra meeting.` };
    }
    seenDays.add(day);

    const startSlotIndex = slotIndexFromTypedTime(timeText, args.slots, day, args.programMode);
    if (startSlotIndex == null) {
      return {
        ok: false,
        error: `“${timeText}” is not a plottable start on ${day}. Use the hour or half hour, such as 8:00 AM or 2:30 PM.`,
      };
    }

    const durationSlots = parseDurationHours(durRaw, args.maxDur);
    if (durationSlots == null) {
      return {
        ok: false,
        error: `Choose a duration for ${day} (${PLOT_STEP_HOURS}–${args.maxDur} hours, in half-hour steps).`,
      };
    }

    /* Rows, not hours: on the half-hour grid a 1.5 hour class covers three of them. */
    if (startSlotIndex + plotRowsForHours(durationSlots, plotSlotHours(args.slots)) > args.slots.length) {
      return {
        ok: false,
        error: `${formatPlotDurationHours(durationSlots)} hour${durationSlots === 1 ? "" : "s"} from “${timeText}” does not fit the ${day} grid.`,
      };
    }

    meetings.push({
      day: day as BsitEvaluatorWeekday,
      startSlotIndex,
      durationSlots,
    });
  }

  if (meetings.length === 0) {
    return { ok: false, error: "Choose at least one day." };
  }

  return { ok: true, meetings };
}
