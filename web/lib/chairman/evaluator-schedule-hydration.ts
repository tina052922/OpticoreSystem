import { BSIT_EVALUATOR_TIME_SLOTS, BSIT_EVALUATOR_WEEKDAYS, type BsitEvaluatorWeekday } from "@/lib/chairman/bsit-evaluator-constants";

/**
 * Normalize Postgres / API time strings ("7:00", "07:00", "7:00:00") to "HH:MM" for slot map lookups.
 */
export function normalizeSlotHHMM(raw: string | null | undefined): string {
  if (!raw) return "00:00";
  const s = raw.trim();
  const base = s.length > 8 ? s.slice(0, 8) : s;
  const parts = base.split(":");
  const h = Math.min(23, Math.max(0, parseInt(parts[0] ?? "0", 10)));
  const m = Math.min(59, Math.max(0, parseInt(parts[1] ?? "0", 10)));
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
}

/** Map DB `ScheduleEntry.day` to chairman evaluator weekday (tolerates casing / minor variants). */
export function normalizeScheduleEntryDayForEvaluator(day: string | null | undefined): BsitEvaluatorWeekday {
  const d = (day ?? "").trim();
  if (!d) return "Monday";
  const lower = d.toLowerCase();
  for (const w of BSIT_EVALUATOR_WEEKDAYS) {
    if (w.toLowerCase() === lower) return w;
  }
  const short: Record<string, BsitEvaluatorWeekday> = {
    mon: "Monday",
    tue: "Tuesday",
    wed: "Wednesday",
    thu: "Thursday",
    fri: "Friday",
  };
  const head = lower.slice(0, 3);
  if (short[head]) return short[head]!;
  return "Monday";
}

/**
 * First 1-hour slot index for chairman / GEC grids (0 = 7:00–8:00). Returns 0 only when no slot matches.
 */
export function startSlotIndexFromScheduleEntryStartTime(startTime: string | null | undefined): number {
  const key = normalizeSlotHHMM(startTime);
  const idx = BSIT_EVALUATOR_TIME_SLOTS.findIndex((t) => t.startTime === key);
  return idx >= 0 ? idx : 0;
}
