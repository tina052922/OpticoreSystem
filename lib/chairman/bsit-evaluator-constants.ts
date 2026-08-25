/** Chairman / GEC evaluator slot tables. Day remains Mon–Fri 7:00 AM–5:00 PM. */

import {
  DAY_ONE_HOUR_SLOTS,
  DAY_PROGRAM_WEEKDAYS,
  NIGHT_FULL_DAY_SLOTS,
  NIGHT_PROGRAM_WEEKDAYS,
  type ProgramMode,
  type ProgramWeekday,
} from "@/lib/scheduling/program-mode";

/** Day Program: Monday–Friday only. */
export const BSIT_EVALUATOR_WEEKDAYS = DAY_PROGRAM_WEEKDAYS;
export type BsitEvaluatorWeekday = ProgramWeekday;

export const NIGHT_EVALUATOR_WEEKDAYS = NIGHT_PROGRAM_WEEKDAYS;

export const BSIT_ONE_HOUR_SLOTS = DAY_ONE_HOUR_SLOTS;

/** @deprecated use BSIT_ONE_HOUR_SLOTS */
export const BSIT_EVALUATOR_TIME_SLOTS = BSIT_ONE_HOUR_SLOTS.map((s) => ({
  label: s.label,
  startTime: s.startTime,
  endTime: s.endTime,
}));

export function evaluatorWeekdays(mode: ProgramMode) {
  return mode === "night" ? NIGHT_EVALUATOR_WEEKDAYS : BSIT_EVALUATOR_WEEKDAYS;
}

export function evaluatorTimeSlots(mode: ProgramMode) {
  return mode === "night" ? NIGHT_FULL_DAY_SLOTS : BSIT_ONE_HOUR_SLOTS;
}
