import type { BsitEvaluatorWeekday } from "@/lib/chairman/bsit-evaluator-constants";
import type { HourSlot, ProgramMode } from "@/lib/scheduling/program-mode";
import { formatSlotStartForInput, slotIndexFromTypedTime } from "@/lib/evaluator/plot-time-input";

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

export function emptyPlotMeetingsDraft(): PlotMeetingsDraft {
  return {
    timeText: "",
    slots: Array.from({ length: PLOT_MEETING_SLOT_COUNT }, () => emptyPlotMeetingSlot()),
  };
}

export function seedPlotMeetingsDraft(args: {
  day: string;
  startSlotIndex: number;
  durationSlots?: number;
  slots: HourSlot[];
}): PlotMeetingsDraft {
  const draft = emptyPlotMeetingsDraft();
  const first = draft.slots[0];
  if (!first) return draft;
  first.day = args.day;
  first.durationHours = String(Math.max(1, Math.round(args.durationSlots ?? 1)));
  draft.timeText =
    args.startSlotIndex >= 0 ? formatSlotStartForInput(args.slots[args.startSlotIndex]) : "";
  return draft;
}

function parseDurationHours(raw: string, maxDur: number): number | null {
  const n = parseFloat(raw.trim());
  if (!Number.isFinite(n)) return null;
  const rounded = Math.round(n);
  if (rounded < 1 || rounded > maxDur) return null;
  return rounded;
}

export function filledPlotMeetingCount(draft: PlotMeetingsDraft): number {
  return draft.slots.filter((s) => s.day.trim()).length;
}

export function totalPlotMeetingHours(draft: PlotMeetingsDraft, maxDur: number): number {
  let sum = 0;
  for (const slot of draft.slots) {
    if (!slot.day.trim()) continue;
    const d = parseDurationHours(slot.durationHours || "1", maxDur);
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
  const timeText = draft.timeText.trim();
  if (!timeText) {
    return { ok: false, error: "Type a start time (for example 8:00 AM)." };
  }

  const meetings: ResolvedPlotMeeting[] = [];
  const seenDays = new Set<string>();

  for (let i = 0; i < draft.slots.length; i++) {
    const slot = draft.slots[i];
    if (!slot) continue;
    const day = slot.day.trim();
    const durRaw = slot.durationHours.trim();
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
        error: `“${timeText}” is not a plottable hourly start on ${day}. Use a time such as 8:00 AM.`,
      };
    }

    const durationSlots = parseDurationHours(durRaw || "1", args.maxDur);
    if (durationSlots == null) {
      return {
        ok: false,
        error: `Duration for ${day} must be between 1 and ${args.maxDur} hour${args.maxDur === 1 ? "" : "s"}.`,
      };
    }

    if (startSlotIndex + durationSlots > args.slots.length) {
      return {
        ok: false,
        error: `${durationSlots} hour${durationSlots === 1 ? "" : "s"} from “${timeText}” does not fit the ${day} grid.`,
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
