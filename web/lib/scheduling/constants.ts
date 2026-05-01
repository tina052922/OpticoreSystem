/** Institutional scheduling constants (aligned with prospectus / policy placeholders). */

export const WEEKDAYS = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"] as const;
export type Weekday = (typeof WEEKDAYS)[number];

/** 2-hour teaching blocks used for plotting (start–end, 24h). */
export const TIME_SLOT_OPTIONS: { label: string; startTime: string; endTime: string }[] = [
  { label: "07:00 – 09:00", startTime: "07:00", endTime: "09:00" },
  { label: "09:00 – 11:00", startTime: "09:00", endTime: "11:00" },
  { label: "11:00 – 13:00", startTime: "11:00", endTime: "13:00" },
  { label: "13:00 – 15:00", startTime: "13:00", endTime: "15:00" },
  { label: "15:00 – 17:00", startTime: "15:00", endTime: "17:00" },
  { label: "17:00 – 19:00", startTime: "17:00", endTime: "19:00" },
];

/** Soft constraint for GA: aligns with standard weekly teaching hours. */
export const DEFAULT_MAX_FACULTY_HOURS_PER_WEEK = 24;

/**
 * CTU Faculty Manual / Merit System — weekly contact derived from plotted timetable.
 * (Semester “units” are approximated from contact hours for scheduling checks.)
 */
export const FACULTY_POLICY_CONSTANTS = {
  /**
   * Typical undergraduate teaching contact (hrs/week) before overload justification.
   * Aligns with Faculty Merit System upper bound for regular faculty (18–24 hrs/wk range).
   */
  STANDARD_WEEKLY_TEACHING_HOURS: 24,
  /** Lab / shop weekly contact ceiling. */
  MAX_WEEKLY_LAB_CONTACT_HOURS: 30,
  /** Lecture-equivalent weekly contact beyond official time (overload track). */
  MAX_WEEKLY_LECTURE_OVERLOAD_HOURS: 21,
  /** Part-time faculty weekly teaching ceiling. */
  PARTTIME_MAX_WEEKLY_HOURS: 27,
  /** Resident faculty — total reference contact bound for heavy overload flag. */
  MAX_WEEKLY_RESIDENT_CONTACT_HOURS: 40,
} as const;

/** Majors keyed by program id (COTE prospectus — example data). */
export const PROGRAM_MAJORS: Record<string, string[]> = {
  "prog-bit-elx": ["Electronics Technology"],
  "prog-bit-dt": ["Drafting Technology"],
  "prog-bit-auto": ["Automotive Technology"],
  "prog-bit-gar": ["Garments Technology"],
  "prog-bsit": ["Information Technology"],
  "prog-bsie": ["Industrial Engineering"],
  "prog-bs-envsci": ["Environmental Science"],
};
