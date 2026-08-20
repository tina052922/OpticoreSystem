function parseTimeToMinutes(t: string): number {
  const [h, m] = t.split(":").map((x) => parseInt(x, 10));
  return (h || 0) * 60 + (m || 0);
}

/** Duration of one weekly meeting in hours (from timetable slot). */
export function slotDurationHours(startTime: string, endTime: string): number {
  const a = parseTimeToMinutes(startTime);
  const b = parseTimeToMinutes(endTime);
  return Math.max(0, (b - a) / 60);
}

