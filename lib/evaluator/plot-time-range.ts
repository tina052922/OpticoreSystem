import { timesFromSlotRange } from "@/lib/evaluator/plot-duration";
import { formatTimeRange12h } from "@/lib/time/format-12h";

/**
 * The clock time a plotted meeting covers, e.g. `"10:00 AM – 11:30 AM"`.
 *
 * Six components grew their own copy of this, each reading the end off
 * `slots[effectiveStart + dur - 1].endTime`. That shortcut can only ever land on the hour, so once
 * meetings could run for 1.5 hours every one of those copies reported the wrong end time — and the
 * drift between copies meant fixing one fixed nothing else. The end is now derived from the start
 * plus the duration, in one place.
 */
export function formatPlotTimeRange(
  effectiveStart: number,
  dur: number,
  slots: { startTime: string; endTime: string }[],
): string {
  const times = timesFromSlotRange(effectiveStart, dur, slots);
  if (!times) return "—";
  return formatTimeRange12h(times.startTime, times.endTime);
}

/**
 * INS-style labels: the full range, plus one line per hourly row the meeting touches.
 *
 * The last line of a meeting that ends on the half hour is trimmed to it, so the lines add up to the
 * range rather than overstating it.
 */
export function formatPlotTimeLines(
  effectiveStart: number,
  dur: number,
  slots: { label: string; startTime: string; endTime: string }[],
): { fullLine: string; slotLines: string[] } {
  const times = timesFromSlotRange(effectiveStart, dur, slots);
  if (!times) return { fullLine: "—", slotLines: [] };

  const rows = Math.ceil(dur);
  const slotLines: string[] = [];
  for (let k = 0; k < rows; k++) {
    const slot = slots[effectiveStart + k];
    if (!slot) break;
    const isLast = k === rows - 1;
    const partial = isLast && !Number.isInteger(dur);
    slotLines.push(
      partial
        ? formatTimeRange12h(slot.startTime, times.endTime)
        : slot.label || formatTimeRange12h(slot.startTime, slot.endTime),
    );
  }
  return { fullLine: formatTimeRange12h(times.startTime, times.endTime), slotLines };
}
