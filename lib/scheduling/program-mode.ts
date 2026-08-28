/**
 * Day Program vs Night Program — independent loads, grids, and conflict universes.
 *
 * Night windows (official INS Form 5A/5B/5C):
 *   Mon–Fri  4:00 PM – 10:00 PM
 *   Sat–Sun  7:00 AM – 10:00 PM
 *
 * Day Program (unchanged):
 *   Mon–Fri  7:00 AM – 5:00 PM
 *
 * Persistence: `ScheduleEntry.programMode` when the column exists. If it does not,
 * night rows are stored with a `Night::` day prefix so Day and Night never mix.
 */

export const PROGRAM_MODES = ["day", "night"] as const;
export type ProgramMode = (typeof PROGRAM_MODES)[number];

export const DEFAULT_PROGRAM_MODE: ProgramMode = "day";

/** Stored on `ScheduleEntry.day` when the `programMode` column is unavailable. */
export const NIGHT_DAY_PREFIX = "Night::";

export const PROGRAM_MODE_STORAGE_KEY = "opticore.programMode";

export const ALL_WEEKDAYS = [
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
  "Sunday",
] as const;
export type ProgramWeekday = (typeof ALL_WEEKDAYS)[number];

export const DAY_PROGRAM_WEEKDAYS = [
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
] as const;

export const NIGHT_PROGRAM_WEEKDAYS = ALL_WEEKDAYS;

function format12h(hour24: number): string {
  const h = ((hour24 % 24) + 24) % 24;
  if (h === 0) return "12:00 AM";
  if (h < 12) return `${h}:00 AM`;
  if (h === 12) return "12:00 PM";
  return `${h - 12}:00 PM`;
}

export type HourSlot = {
  slotIndex: number;
  label: string;
  startTime: string;
  endTime: string;
  startHour: number;
};

function buildHourSlots(startHour: number, count: number): HourSlot[] {
  return Array.from({ length: count }, (_, i) => {
    const startH = startHour + i;
    const endH = startH + 1;
    return {
      slotIndex: i,
      label: `${format12h(startH)} - ${format12h(endH)}`,
      startTime: `${String(startH).padStart(2, "0")}:00`,
      endTime: `${String(endH).padStart(2, "0")}:00`,
      startHour: startH,
    };
  });
}

/** Day Evaluator / INS: 7:00 AM – 5:00 PM (10 hourly slots). */
export const DAY_ONE_HOUR_SLOTS: HourSlot[] = buildHourSlots(7, 10);

/** Night weekend + full night window: 7:00 AM – 10:00 PM (15 hourly slots). */
export const NIGHT_FULL_DAY_SLOTS: HourSlot[] = buildHourSlots(7, 15);

/** Night Mon–Fri INS/evaluator: 4:00 PM – 10:00 PM (6 hourly slots). */
export const NIGHT_WEEKDAY_SLOTS: HourSlot[] = buildHourSlots(16, 6);

/** Official night INS labels for Saturday/Sunday (12-hour, matching paper forms). */
export const NIGHT_INS_WEEKEND_SLOT_LABELS = [
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
  "7:00-8:00",
  "8:00-9:00",
  "9:00-10:00",
] as const;

export const NIGHT_INS_WEEKDAY_SLOT_LABELS = [
  "4:00-5:00",
  "5:00-6:00",
  "6:00-7:00",
  "7:00-8:00",
  "8:00-9:00",
  "9:00-10:00",
] as const;

export function isProgramMode(v: unknown): v is ProgramMode {
  return v === "day" || v === "night";
}

export function parseProgramMode(v: unknown): ProgramMode {
  if (typeof v === "string") {
    const s = v.trim().toLowerCase();
    if (s === "night") return "night";
    if (s === "day") return "day";
  }
  return DEFAULT_PROGRAM_MODE;
}

export function programModeLabel(mode: ProgramMode): string {
  return mode === "night" ? "Night Program" : "Day Program";
}

export function stripNightDayPrefix(day: string): string {
  const raw = (day ?? "").trim();
  if (raw.toLowerCase().startsWith(NIGHT_DAY_PREFIX.toLowerCase())) {
    return raw.slice(NIGHT_DAY_PREFIX.length).trim();
  }
  return raw;
}

export function encodeDayForStorage(day: string, mode: ProgramMode): string {
  const cal = stripNightDayPrefix(day);
  return mode === "night" ? `${NIGHT_DAY_PREFIX}${cal}` : cal;
}

function startHourFromTime(startTime?: string | null): number | null {
  if (!startTime) return null;
  const h = parseInt(String(startTime).trim().split(":")[0] ?? "", 10);
  return Number.isFinite(h) ? h : null;
}

/**
 * Untagged legacy rows: weekend and after 5:00 PM are Night-only windows.
 * Friday 4:00–5:00 PM stays Day unless `programMode` / `Night::` says otherwise.
 */
function inferProgramModeFromShape(row: { day?: string | null; startTime?: string | null }): ProgramMode | null {
  if (isWeekend(row.day ?? "")) return "night";
  const hour = startHourFromTime(row.startTime);
  if (hour != null && hour >= 17) return "night";
  return null;
}

export function resolveProgramMode(row: {
  programMode?: string | null;
  programSession?: string | null;
  day?: string | null;
  startTime?: string | null;
}): ProgramMode {
  if (isProgramMode(row.programMode)) return row.programMode;
  if (isProgramMode(row.programSession)) return row.programSession;
  const raw = (row.programMode ?? row.programSession ?? "").trim().toLowerCase();
  if (raw === "night" || raw === "day") return raw;
  if ((row.day ?? "").toLowerCase().startsWith(NIGHT_DAY_PREFIX.toLowerCase())) return "night";
  return inferProgramModeFromShape(row) ?? DEFAULT_PROGRAM_MODE;
}

export function hydrateScheduleEntry<T extends {
  day?: string;
  programMode?: string | null;
  startTime?: string | null;
}>(row: T): T & { programMode: ProgramMode; day: string } {
  const mode = resolveProgramMode(row);
  return {
    ...row,
    day: stripNightDayPrefix(row.day ?? ""),
    programMode: mode,
  };
}

export function hydrateScheduleEntries<T extends {
  day?: string;
  programMode?: string | null;
  startTime?: string | null;
}>(rows: T[] | null | undefined): Array<T & { programMode: ProgramMode; day: string }> {
  return (rows ?? []).map((r) => hydrateScheduleEntry(r));
}

/** Stamp an explicit Day/Night marker, keeping a row's existing mode when already set. */
export function stampProgramMode<T extends { programMode?: string | null }>(
  row: T,
  fallback: ProgramMode,
): T & { programMode: ProgramMode } {
  return {
    ...row,
    programMode: isProgramMode(row.programMode) ? row.programMode : fallback,
  };
}

export function matchesProgramMode(
  row: { programMode?: string | null; day?: string | null; startTime?: string | null },
  mode: ProgramMode,
): boolean {
  return resolveProgramMode(row) === mode;
}

export function filterByProgramMode<T extends { programMode?: string | null; day?: string | null; startTime?: string | null }>(
  rows: T[],
  mode: ProgramMode,
): T[] {
  return rows.filter((r) => matchesProgramMode(r, mode));
}

export function evaluatorWeekdaysForMode(mode: ProgramMode): readonly ProgramWeekday[] {
  return mode === "night" ? NIGHT_PROGRAM_WEEKDAYS : DAY_PROGRAM_WEEKDAYS;
}

export function evaluatorSlotsForMode(mode: ProgramMode): HourSlot[] {
  return mode === "night" ? NIGHT_FULL_DAY_SLOTS : DAY_ONE_HOUR_SLOTS;
}

/** Alias used by Evaluator worksheets. */
export const evaluatorTimeSlots = evaluatorSlotsForMode;

export function isWeekend(day: string): boolean {
  const d = stripNightDayPrefix(day).trim().toLowerCase();
  return d === "saturday" || d === "sunday" || d === "sat" || d === "sun";
}

/**
 * Night Mon–Fri may only be plotted 4:00 PM–10:00 PM.
 * Night Sat–Sun may be plotted 7:00 AM–10:00 PM.
 * Day Program: all day-evaluator slots are plottable (Mon–Fri 7:00 AM–5:00 PM).
 */
export function isEvaluatorSlotPlottable(mode: ProgramMode, day: string, slot: HourSlot): boolean {
  if (mode === "day") return slot.startHour >= 7 && slot.startHour < 17;
  if (isWeekend(day)) return slot.startHour >= 7 && slot.startHour < 22;
  return slot.startHour >= 16 && slot.startHour < 22;
}

export function readStoredProgramMode(): ProgramMode {
  if (typeof window === "undefined") return DEFAULT_PROGRAM_MODE;
  try {
    return parseProgramMode(window.localStorage.getItem(PROGRAM_MODE_STORAGE_KEY));
  } catch {
    return DEFAULT_PROGRAM_MODE;
  }
}

export function writeStoredProgramMode(mode: ProgramMode): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(PROGRAM_MODE_STORAGE_KEY, mode);
  } catch {
    /* quota / private mode */
  }
}
