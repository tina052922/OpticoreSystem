import type { SparseScheduleBlock } from "@/lib/scheduling/conflicts";
import {
  LUNCH_BREAK_END_MINUTES,
  LUNCH_BREAK_START_MINUTES,
  stripNightDayPrefix,
  type HourSlot,
} from "@/lib/scheduling/program-mode";
import { formatHHMMTo12h } from "@/lib/time/format-12h";
import { PLOT_DURATION_OPTIONS } from "@/lib/evaluator/plot-meetings";

function toMinutes(hhmm: string | null | undefined): number | null {
  const [h, m] = String(hhmm ?? "").trim().split(":");
  const hours = parseInt(h ?? "", 10);
  const minutes = parseInt(m ?? "0", 10);
  if (!Number.isFinite(hours) || !Number.isFinite(minutes)) return null;
  return hours * 60 + minutes;
}

function fromMinutes(total: number): string {
  return `${String(Math.floor(total / 60)).padStart(2, "0")}:${String(total % 60).padStart(2, "0")}`;
}

function formatHours(minutes: number): string {
  if (minutes < 60) return `${minutes} min`;
  const h = minutes / 60;
  return `${Number.isInteger(h) ? h : h.toFixed(1)} hr${h === 1 ? "" : "s"}`;
}

export type PlotFreeTime = {
  /** Minutes free from the start until the next class, lunch, or the end of the day. */
  freeMinutes: number;
  /** "10:00 AM" — where the free time ends. */
  untilLabel: string;
  /** What ends it. */
  until: "class" | "lunch" | "end";
};

/**
 * How long a section is free from `startTime` on `day`, before its next class, the lunch break, or
 * the end of the grid. Null when the start itself is already taken (the conflict check says that).
 */
export function sectionFreeTimeFrom(args: {
  sectionId: string;
  day: string;
  startTime: string;
  blocks: SparseScheduleBlock[];
  slots: HourSlot[];
  excludeId?: string;
}): PlotFreeTime | null {
  const start = toMinutes(args.startTime);
  if (start == null || !args.sectionId || !args.day) return null;
  const day = stripNightDayPrefix(args.day).toLowerCase();

  const last = args.slots[args.slots.length - 1];
  let bound = toMinutes(last?.endTime) ?? start;
  let until: PlotFreeTime["until"] = "end";

  if (start < LUNCH_BREAK_START_MINUTES && LUNCH_BREAK_START_MINUTES < bound) {
    bound = LUNCH_BREAK_START_MINUTES;
    until = "lunch";
  }
  if (start >= LUNCH_BREAK_START_MINUTES && start < LUNCH_BREAK_END_MINUTES) return null;

  for (const b of args.blocks) {
    if (b.id === args.excludeId || b.sectionId !== args.sectionId) continue;
    if (stripNightDayPrefix(b.day).toLowerCase() !== day) continue;
    const bs = toMinutes(b.startTime);
    const be = toMinutes(b.endTime);
    if (bs == null || be == null) continue;
    if (bs <= start && be > start) return null;
    if (bs >= start && bs < bound) {
      bound = bs;
      until = "class";
    }
  }

  return { freeMinutes: Math.max(0, bound - start), untilLabel: formatHHMMTo12h(fromMinutes(bound)), until };
}

/**
 * A short notice when the chosen start leaves too little room for a 1 hr / 1.5 hr meeting, or for
 * the duration picked. Null when the meeting fits.
 */
export function plotFreeTimeNotice(args: {
  day: string;
  startTime: string;
  durationHours: number | null;
  free: PlotFreeTime | null;
}): string | null {
  const { free } = args;
  if (!free) return null;
  const shortest = Math.min(...PLOT_DURATION_OPTIONS) * 60;
  const what = free.until === "class" ? "next class" : free.until === "lunch" ? "lunch break" : "end of day";
  const from = formatHHMMTo12h(args.startTime);
  if (free.freeMinutes < shortest) {
    return `Only ${formatHours(free.freeMinutes)} free on ${args.day} from ${from} (${what} at ${free.untilLabel}). A meeting must be 1 hr or 1.5 hrs, so pick another start time.`;
  }
  const want = (args.durationHours ?? 0) * 60;
  if (want > free.freeMinutes) {
    return `Only ${formatHours(free.freeMinutes)} free on ${args.day} from ${from} (${what} at ${free.untilLabel}). Choose ${formatHours(free.freeMinutes >= 90 ? 90 : 60)} or another start time.`;
  }
  return null;
}
