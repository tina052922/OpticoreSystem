/** Safe HH:MM helpers for instructor schedule-change request UI. */

export function timeToMinutes(t: string | null | undefined): number {
  if (typeof t !== "string") return 0;
  const raw = t.trim();
  if (!raw) return 0;
  const base = raw.length > 5 ? raw.slice(0, 5) : raw;
  const [h, m] = base.split(":").map((x) => parseInt(x, 10));
  if (Number.isNaN(h) || Number.isNaN(m)) return 0;
  return h * 60 + m;
}

/** Value for `<input type="time" />` (HH:MM). */
export function toTimeInputValue(t: string | null | undefined): string {
  const m = timeToMinutes(t);
  const h = Math.floor(m / 60) % 24;
  const min = m % 60;
  return `${String(h).padStart(2, "0")}:${String(min).padStart(2, "0")}`;
}

export function addMinutesToTimeInput(start: string | null | undefined, durationMinutes: number): string {
  const m = timeToMinutes(start) + durationMinutes;
  const norm = ((m % (24 * 60)) + 24 * 60) % (24 * 60);
  const h = Math.floor(norm / 60);
  const min = norm % 60;
  return `${String(h).padStart(2, "0")}:${String(min).padStart(2, "0")}`;
}

export function meetingDurationMinutes(
  startTime: string | null | undefined,
  endTime: string | null | undefined,
): number {
  return Math.max(30, timeToMinutes(endTime) - timeToMinutes(startTime));
}
