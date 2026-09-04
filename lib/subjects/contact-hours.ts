/** CHED-style contact conversion used campus-wide for subject codes. */
export const LEC_HOURS_PER_UNIT = 1;
export const LAB_HOURS_PER_UNIT = 3;

export function lectureHoursFromUnits(lecUnits: number | null | undefined): number {
  const n = Number(lecUnits);
  if (!Number.isFinite(n) || n <= 0) return 0;
  return n * LEC_HOURS_PER_UNIT;
}

export function labHoursFromUnits(labUnits: number | null | undefined): number {
  const n = Number(labUnits);
  if (!Number.isFinite(n) || n <= 0) return 0;
  return n * LAB_HOURS_PER_UNIT;
}

/** Weekly contact hours: lecture 1 unit = 1 hour, laboratory 1 unit = 3 hours. */
export function weeklyContactHoursFromUnits(
  lecUnits: number | null | undefined,
  labUnits: number | null | undefined,
): number {
  return lectureHoursFromUnits(lecUnits) + labHoursFromUnits(labUnits);
}
