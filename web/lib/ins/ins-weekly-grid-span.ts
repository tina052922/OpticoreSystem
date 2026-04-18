import { INS_TIME_SLOTS, type InsDay } from "@/components/ins/ins-layout/opticore-ins-constants";

/** Minutes from midnight; tolerant of "7:00", "07:00", "7:00:00". */
export function insHmToMinutes(raw: string): number {
  const s = raw.trim();
  const parts = s.split(":");
  const h = parseInt(parts[0] ?? "0", 10);
  const m = parseInt(parts[1] ?? "0", 10);
  if (Number.isNaN(h) || Number.isNaN(m)) return 0;
  return h * 60 + m;
}

/** One row on the INS weekly table (e.g. "7:00-8:00"). */
export function insSlotBoundsMinutes(slotLabel: string): { startMin: number; endMin: number } {
  const [a, b] = slotLabel.split("-").map((x) => x.trim());
  let startMin = insHmToMinutes(a ?? "0:00");
  let endMin = insHmToMinutes(b ?? "0:00");
  if (endMin <= startMin) endMin += 24 * 60;
  return { startMin, endMin };
}

const SLOT_BOUNDS = INS_TIME_SLOTS.map((label) => insSlotBoundsMinutes(label));

export function insSlotCount(): number {
  return INS_TIME_SLOTS.length;
}

/** First slot index overlapping [entryStart, entryEnd) in half-open minutes (aligns with conflict overlap logic). */
export function insSpanRangeFromMinutes(
  entryStartMin: number,
  entryEndMin: number,
): { startIdx: number; rowSpan: number } | null {
  let first = -1;
  let last = -1;
  for (let i = 0; i < SLOT_BOUNDS.length; i++) {
    const { startMin: ss, endMin: se } = SLOT_BOUNDS[i]!;
    if (entryStartMin < se && entryEndMin > ss) {
      if (first < 0) first = i;
      last = i;
    }
  }
  if (first < 0 || last < 0) return null;
  return { startIdx: first, rowSpan: last - first + 1 };
}

/** Attach to INS grid rows; `startTime`/`endTime` enable correct multi-hour rowspan (Evaluator-style). */
export type InsTimedCell = {
  time: string;
  startTime?: string;
  endTime?: string;
};

/**
 * Prefer raw ScheduleEntry times; fallback to parsing the display label `time` ("7:00-10:00").
 */
export function insParseCellTimeMinutes(cell: InsTimedCell): { startMin: number; endMin: number } | null {
  const st = cell.startTime?.trim();
  const et = cell.endTime?.trim();
  if (st && et) {
    let s = insHmToMinutes(st.slice(0, 8));
    let e = insHmToMinutes(et.slice(0, 8));
    if (e <= s) e += 24 * 60;
    return { startMin: s, endMin: e };
  }
  const label = cell.time.trim();
  const dash = label.indexOf("-");
  if (dash < 0) return null;
  const left = label.slice(0, dash).trim();
  const right = label.slice(dash + 1).trim();
  let s = insHmToMinutes(left);
  let e = insHmToMinutes(right);
  if (e <= s) e += 24 * 60;
  return { startMin: s, endMin: e };
}

export type InsSlotRenderPick<T extends InsTimedCell> =
  | { kind: "skip" }
  | { kind: "empty"; placeholder: boolean }
  | { kind: "fill"; rowSpan: number; items: T[] };

/**
 * For one weekday column, decide how to render `slotIdx` (0-based INS_TIME_SLOTS index).
 */
export function insPickSlotRender<T extends InsTimedCell>(
  day: InsDay,
  slotIdx: number,
  cells: T[] | undefined,
  opts: { mondayPlaceholderSlot?: boolean },
): InsSlotRenderPick<T> {
  const list = cells ?? [];
  const expanded: Array<{ item: T; startIdx: number; rowSpan: number }> = [];
  for (const item of list) {
    const mins = insParseCellTimeMinutes(item);
    if (!mins) continue;
    const span = insSpanRangeFromMinutes(mins.startMin, mins.endMin);
    if (!span) continue;
    expanded.push({ item, startIdx: span.startIdx, rowSpan: span.rowSpan });
  }

  const covering = expanded.filter((x) => slotIdx > x.startIdx && slotIdx < x.startIdx + x.rowSpan);
  if (covering.length > 0) {
    return { kind: "skip" };
  }

  const starters = expanded.filter((x) => x.startIdx === slotIdx);
  if (starters.length === 0) {
    const placeholder = Boolean(opts.mondayPlaceholderSlot && day === "Monday" && slotIdx === 0);
    return { kind: "empty", placeholder };
  }

  const rowSpan = Math.max(...starters.map((s) => s.rowSpan));
  return { kind: "fill", rowSpan, items: starters.map((s) => s.item) };
}
