/** BSIT Chairman evaluator: Monday–Friday only. */
export const BSIT_EVALUATOR_WEEKDAYS = [
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
] as const;

export type BsitEvaluatorWeekday = (typeof BSIT_EVALUATOR_WEEKDAYS)[number];

function format12h(hour24: number): string {
  if (hour24 <= 0 || hour24 > 23) return `${hour24}:00`;
  if (hour24 < 12) return `${hour24 === 0 ? 12 : hour24}:00 AM`;
  if (hour24 === 12) return "12:00 PM";
  return `${hour24 - 12}:00 PM`;
}

/**
 * INS Form style: 1-hour increments, 7:00 AM–5:00 PM (10 slots).
 * Each slot: label + 24h start/end for conflict detection.
 */
export const BSIT_ONE_HOUR_SLOTS: {
  slotIndex: number;
  label: string;
  startTime: string;
  endTime: string;
}[] = Array.from({ length: 10 }, (_, i) => {
  const startH = 7 + i;
  const endH = startH + 1;
  const label = `${format12h(startH)} - ${format12h(endH)}`;
  const startTime = `${String(startH).padStart(2, "0")}:00`;
  const endTime = `${String(endH).padStart(2, "0")}:00`;
  return { slotIndex: i, label, startTime, endTime };
});

/** @deprecated use BSIT_ONE_HOUR_SLOTS */
export const BSIT_EVALUATOR_TIME_SLOTS = BSIT_ONE_HOUR_SLOTS.map((s) => ({
  label: s.label,
  startTime: s.startTime,
  endTime: s.endTime,
}));
