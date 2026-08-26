import {
  insTimeSlotLabels,
  NIGHT_PROGRAM_WEEKDAYS,
  type ProgramSessionWeekday,
} from "@/lib/scheduling/program-session";
import { stripNightDayPrefix } from "@/lib/scheduling/program-mode";

export const INS_TIME_SLOTS = insTimeSlotLabels("night");

/** Printed INS Forms 5A/5B/5C always include Sat and Sun, including Day Program. */
export const INS_DAYS = [...NIGHT_PROGRAM_WEEKDAYS] as const;

export type InsDay = ProgramSessionWeekday;

export function toInsDay(day: string): InsDay | null {
  const cal = stripNightDayPrefix(day).trim();
  return INS_DAYS.find((x) => x.toLowerCase() === cal.toLowerCase()) ?? null;
}
