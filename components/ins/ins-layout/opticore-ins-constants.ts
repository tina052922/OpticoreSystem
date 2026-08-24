import {
  insTimeSlotLabels,
  NIGHT_PROGRAM_WEEKDAYS,
  type ProgramSessionWeekday,
} from "@/lib/scheduling/program-session";

export const INS_TIME_SLOTS = insTimeSlotLabels("night");

export const INS_DAYS = [...NIGHT_PROGRAM_WEEKDAYS] as const;

export type InsDay = ProgramSessionWeekday;
