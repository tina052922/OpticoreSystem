import { formatHHMMTo12h } from "@/lib/time/format-12h";
import {
  isEvaluatorSlotPlottable,
  type HourSlot,
  type ProgramMode,
} from "@/lib/scheduling/program-mode";

export type ParsedPlotTime = {
  hour: number;
  minute: number;
  /** True when the typed value included AM/PM or a 24-hour hour (≥ 13). */
  unambiguous: boolean;
};

/**
 * Parse a typed plot start time: `8`, `8:00`, `8am`, `8:00 AM`, `08:00`, `16:00`.
 * Minutes other than `:00` are rejected — the evaluator grid is hourly.
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
  if (!Number.isFinite(hour) || !Number.isFinite(minute) || minute !== 0) return null;

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

/**
 * Map typed start time onto the active evaluator hour grid for a given day.
 * Hour-only values without AM/PM match the unique plottable slot with that clock hour.
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
    const hit = candidates.find((s) => s.startHour === parsed.hour);
    return hit ? hit.slotIndex : null;
  }

  const clock = parsed.hour % 12;
  const matches = candidates.filter((s) => s.startHour % 12 === clock);
  if (matches.length === 1) return matches[0]!.slotIndex;
  return null;
}
