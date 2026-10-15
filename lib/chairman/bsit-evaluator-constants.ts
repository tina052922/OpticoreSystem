/** Chairman / GEC evaluator slot tables. Day remains Mon–Fri 7:00 AM–5:00 PM. */

import {
  DAY_PLOT_SLOTS,
  DAY_PROGRAM_WEEKDAYS,
  NIGHT_PLOT_SLOTS,
  NIGHT_PROGRAM_WEEKDAYS,
  type ProgramMode,
  type ProgramWeekday,
} from "@/lib/scheduling/program-mode";

/** Day Program: Monday–Friday only. */
export const BSIT_EVALUATOR_WEEKDAYS = DAY_PROGRAM_WEEKDAYS;
export type BsitEvaluatorWeekday = ProgramWeekday;

export const NIGHT_EVALUATOR_WEEKDAYS = NIGHT_PROGRAM_WEEKDAYS;

/**
 * The rows of the Day evaluator grid: half hours, so a class can start at 2:30.
 *
 * Named for what it is rather than for an hour, because it is no longer one — code that assumes a
 * slot is sixty minutes is wrong now, and the name should say so.
 */
export const BSIT_PLOT_SLOTS = DAY_PLOT_SLOTS;

export function evaluatorWeekdays(mode: ProgramMode) {
  return mode === "night" ? NIGHT_EVALUATOR_WEEKDAYS : BSIT_EVALUATOR_WEEKDAYS;
}

export function evaluatorTimeSlots(mode: ProgramMode) {
  return mode === "night" ? NIGHT_PLOT_SLOTS : BSIT_PLOT_SLOTS;
}
