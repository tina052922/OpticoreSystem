import { formatHHMMTo12h } from "@/lib/time/format-12h";
import {
  isEvaluatorSlotPlottable,
  type HourSlot,
  type ProgramMode,
} from "@/lib/scheduling/program-mode";

/** Starts land on the half hour, matching one grid row. */
const PLOT_START_STEP_MINUTES = 30;

export type ParsedPlotTime = {
  hour: number;
  minute: number;
  /** True when the typed value included AM/PM or a 24-hour hour (≥ 13). */
  unambiguous: boolean;
};

/**
 * Parse a typed plot start time: `8`, `8:00`, `8am`, `8:00 AM`, `08:00`, `16:00`, `2:30 PM`.
 *
 * Minutes must land on a grid row, which is a half hour: `:00` or `:30`. Anything finer has no row
 * to start on, so it is rejected rather than quietly moved.
 */
export function parseTypedPlotTime(raw: string | null | undefined): ParsedPlotTime | null {
  const s = (raw ?? "").trim().toLowerCase().replace(/\s+/g, " ");
  if (!s) return null;

  const ampm = s.match(/\s*(a\.?m\.?|p\.?m\.?)$/i);
  const period = ampm ? (/^p/i.test(ampm[1] ?? "") ? "pm" : "am") : null;
  const timePart = period ? s.slice(0, s.length - (ampm?.[0].length ?? 0)).trim() : s;
  const m = timePart.match(/^(\d{1,2})(?::(\d{2}))?$/);
  if (!m) return null;

  let hour = parseInt(m[1] ?? "", 10);
  const minute = parseInt(m[2] ?? "0", 10);
  if (!Number.isFinite(hour) || !Number.isFinite(minute)) return null;
  if (minute !== 0 && minute !== PLOT_START_STEP_MINUTES) return null;

  if (period) {
    if (hour < 1 || hour > 12) return null;
    if (period === "am") {
      if (hour === 12) hour = 0;
    } else if (hour !== 12) {
      hour += 12;
    }
    if (hour > 23) return null;
    return { hour, minute, unambiguous: true };
  }

  if (hour > 23) return null;
  const token = m[1] ?? "";
  const looks24h = hour > 12 || hour === 0 || (hour < 10 && token.length === 2);
  return { hour, minute, unambiguous: looks24h };
}

export function formatSlotStartForInput(slot: HourSlot | undefined): string {
  if (!slot) return "";
  return formatHHMMTo12h(slot.startTime);
}

/** Minutes from midnight of a slot's start, so `2:30 PM` can be matched as well as `2:00 PM`. */
function slotStartMinutes(slot: HourSlot): number {
  const [h, m] = slot.startTime.split(":");
  return parseInt(h ?? "0", 10) * 60 + parseInt(m ?? "0", 10);
}

/**
 * Map typed start time onto the active evaluator grid for a given day.
 *
 * Matched on hour *and* minute: the grid is pitched in half hours, so `2:00 PM` and `2:30 PM` are
 * different rows and matching on the hour alone would put a 2:30 class at 2:00.
 *
 * Hour-only values without AM/PM match the unique plottable slot with that clock time.
 */
export function slotIndexFromTypedTime(
  raw: string,
  slots: HourSlot[],
  day: string,
  programMode: ProgramMode,
): number | null {
  const parsed = parseTypedPlotTime(raw);
  if (!parsed) return null;
  const candidates = slots.filter((s) => isEvaluatorSlotPlottable(programMode, day, s));
  if (candidates.length === 0) return null;

  if (parsed.unambiguous) {
    const wanted = parsed.hour * 60 + parsed.minute;
    const hit = candidates.find((s) => slotStartMinutes(s) === wanted);
    return hit ? hit.slotIndex : null;
  }

  const clock = (parsed.hour % 12) * 60 + parsed.minute;
  const matches = candidates.filter((s) => slotStartMinutes(s) % (12 * 60) === clock);
  if (matches.length === 1) return matches[0]!.slotIndex;
  return null;
}
