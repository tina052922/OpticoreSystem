import {
  DAY_PROGRAM_SLOTS,
  NIGHT_PROGRAM_WEEKDAYS,
  type ProgramHourSlot,
  type ProgramSessionWeekday,
} from "@/lib/scheduling/program-session";

/** Day-mode column labels: Monday–Friday only. */
export const BSIT_EVALUATOR_WEEKDAYS = [
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
] as const;

/**
 * Plot day including Night Program Saturday/Sunday.
 * Keep this wider than `BSIT_EVALUATOR_WEEKDAYS` so session grids type-check.
 */
export type BsitEvaluatorWeekday = ProgramSessionWeekday;

/**
 * INS Form style: 1-hour increments, 7:00 AM–5:00 PM (10 slots).
 * Same objects as Day program slots (`slotIndex` required by `ProgramHourSlot`).
 */
export const BSIT_ONE_HOUR_SLOTS: ProgramHourSlot[] = DAY_PROGRAM_SLOTS;

/** @deprecated use BSIT_ONE_HOUR_SLOTS */
export const BSIT_EVALUATOR_TIME_SLOTS: ProgramHourSlot[] = DAY_PROGRAM_SLOTS;

export function evaluatorWeekdayIndex(day: string): number {
  return (NIGHT_PROGRAM_WEEKDAYS as readonly string[]).indexOf(day);
}

export function isEvaluatorGridWeekday(day: string): boolean {
  return evaluatorWeekdayIndex(day) >= 0;
}
