export const INS_TIME_SLOTS = [
  "7:00-8:00",
  "8:00-9:00",
  "9:00-10:00",
  "10:00-11:00",
  "11:00-12:00",
  "12:00-1:00",
  "1:00-2:00",
  "2:00-3:00",
  "3:00-4:00",
  "4:00-5:00",
  "5:00-6:00",
  "6:00-7:00",
] as const;

export const INS_DAYS = [
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
  "Sunday",
] as const;

export type InsDay = (typeof INS_DAYS)[number];
