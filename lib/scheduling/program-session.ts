/** Day vs Night program plotting / INS grids. Night is a separate mode; Day stays Mon–Fri 7:00–17:00. */

export type ProgramSession = "day" | "night";

export const PROGRAM_SESSION_STORAGE_KEY = "opticore-program-session";
export const PROGRAM_SESSION_OVERLAY_KEY = "opticore-schedule-program-session-overlay";

export const DAY_PROGRAM_WEEKDAYS = [
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
] as const;

export const NIGHT_PROGRAM_WEEKDAYS = [
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
  "Sunday",
] as const;

export type ProgramSessionWeekday = (typeof NIGHT_PROGRAM_WEEKDAYS)[number];

function format12h(hour24: number): string {
  if (hour24 === 0) return "12:00 AM";
  if (hour24 < 12) return `${hour24}:00 AM`;
  if (hour24 === 12) return "12:00 PM";
  return `${hour24 - 12}:00 PM`;
}

export type ProgramHourSlot = {
  slotIndex: number;
  label: string;
  startTime: string;
  endTime: string;
};

function hourSlots(startHour: number, endHourExclusive: number): ProgramHourSlot[] {
  const length = endHourExclusive - startHour;
  return Array.from({ length }, (_, i) => {
    const startH = startHour + i;
    const endH = startH + 1;
    return {
      slotIndex: i,
      label: `${format12h(startH)} - ${format12h(endH)}`,
      startTime: `${String(startH).padStart(2, "0")}:00`,
      endTime: `${String(endH).padStart(2, "0")}:00`,
    };
  });
}

/** Day evaluator: 7:00 AM–5:00 PM (10 slots). */
export const DAY_PROGRAM_SLOTS = hourSlots(7, 17);

/** Night evaluator/INS: 7:00 AM–10:00 PM so weekday Closed cells and weekend mornings share one grid. */
export const NIGHT_PROGRAM_SLOTS = hourSlots(7, 22);

export function weekdaysForSession(session: ProgramSession): readonly ProgramSessionWeekday[] {
  return session === "night" ? NIGHT_PROGRAM_WEEKDAYS : DAY_PROGRAM_WEEKDAYS;
}

export function slotsForSession(session: ProgramSession): ProgramHourSlot[] {
  return session === "night" ? NIGHT_PROGRAM_SLOTS : DAY_PROGRAM_SLOTS;
}

export function isWeekendDay(day: string): boolean {
  const d = day.trim().toLowerCase();
  return d.startsWith("sat") || d.startsWith("sun");
}

function startHourFromHHMM(startTime: string): number {
  const h = parseInt(startTime.trim().split(":")[0] ?? "0", 10);
  return Number.isFinite(h) ? h : 0;
}

/**
 * Night Mon–Fri before 4:00 PM is Closed. Sat–Sun 7:00 AM–10:00 PM is open.
 * Day mode never marks cells Closed via this helper.
 */
export function isNightCellClosed(session: ProgramSession, day: string, startTime: string): boolean {
  if (session !== "night") return false;
  if (isWeekendDay(day)) return false;
  return startHourFromHHMM(startTime) < 16;
}

export function insTimeSlotLabels(session: ProgramSession): string[] {
  return slotsForSession(session).map((s) => {
    const [a, b] = s.label.split(" - ");
    const compact = (t: string) => t.replace(" AM", "").replace(" PM", "").replace(":00", ":00");
    void compact;
    const startH = startHourFromHHMM(s.startTime);
    const endH = startHourFromHHMM(s.endTime);
    const fmt = (h: number) => {
      const hr = h === 0 ? 12 : h > 12 ? h - 12 : h;
      return `${hr}:00`;
    };
    return `${fmt(startH)}-${fmt(endH)}`;
  });
}

export type SessionTagged = {
  programSession?: ProgramSession | string | null;
  day?: string | null;
  startTime?: string | null;
};

export function inferProgramSession(entry: SessionTagged): ProgramSession {
  const tagged = String(entry.programSession ?? "").trim().toLowerCase();
  if (tagged === "night" || tagged === "day") return tagged;
  if (isWeekendDay(entry.day ?? "")) return "night";
  if (startHourFromHHMM(entry.startTime ?? "07:00") >= 16) return "night";
  return "day";
}

export function entryMatchesSession(entry: SessionTagged, session: ProgramSession): boolean {
  return inferProgramSession(entry) === session;
}

export function readStoredProgramSession(): ProgramSession {
  if (typeof window === "undefined") return "day";
  try {
    const v = window.localStorage.getItem(PROGRAM_SESSION_STORAGE_KEY);
    return v === "night" ? "night" : "day";
  } catch {
    return "day";
  }
}

export function writeStoredProgramSession(session: ProgramSession): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(PROGRAM_SESSION_STORAGE_KEY, session);
  } catch {
    /* ignore quota */
  }
}

type OverlayMap = Record<string, ProgramSession>;

export function readProgramSessionOverlay(): OverlayMap {
  if (typeof window === "undefined") return {};
  try {
    const raw = window.localStorage.getItem(PROGRAM_SESSION_OVERLAY_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw) as OverlayMap;
    return parsed && typeof parsed === "object" ? parsed : {};
  } catch {
    return {};
  }
}

export function writeProgramSessionOverlay(next: OverlayMap): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(PROGRAM_SESSION_OVERLAY_KEY, JSON.stringify(next));
  } catch {
    /* ignore */
  }
}

export function rememberEntryProgramSession(entryId: string, session: ProgramSession): void {
  const overlay = readProgramSessionOverlay();
  overlay[entryId] = session;
  writeProgramSessionOverlay(overlay);
}

export function applyProgramSessionOverlay<T extends SessionTagged & { id?: string }>(entry: T): T {
  if (!entry.id) return entry;
  const overlay = readProgramSessionOverlay();
  const tagged = overlay[entry.id];
  if (!tagged) return entry;
  return { ...entry, programSession: tagged };
}
