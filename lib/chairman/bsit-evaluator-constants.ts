import { DAY_PROGRAM_SLOTS, type ProgramHourSlot } from "@/lib/scheduling/program-session";

/** BSIT Chairman evaluator: Monday–Friday only. */
export const BSIT_EVALUATOR_WEEKDAYS = [
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
] as const;

export type BsitEvaluatorWeekday = (typeof BSIT_EVALUATOR_WEEKDAYS)[number];

/**
 * INS Form style: 1-hour increments, 7:00 AM–5:00 PM (10 slots).
 * Same objects as Day program slots (`slotIndex` required by `ProgramHourSlot`).
 */
export const BSIT_ONE_HOUR_SLOTS: ProgramHourSlot[] = DAY_PROGRAM_SLOTS;

/** @deprecated use BSIT_ONE_HOUR_SLOTS */
export const BSIT_EVALUATOR_TIME_SLOTS: ProgramHourSlot[] = DAY_PROGRAM_SLOTS;
