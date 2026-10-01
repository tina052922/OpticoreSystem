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

export type SubjectContactHoursInput = {
  lecUnits?: number | null;
  labUnits?: number | null;
  lecHours?: number | null;
  labHours?: number | null;
};

/**
 * A subject's lecture and laboratory contact hours per week.
 *
 * **Recorded hours always win.** Units are a fallback for a subject that has no hours recorded at
 * all, and nothing more.
 *
 * Getting this order wrong is what made the Evaluator summary disagree with Subject Codes. The unit
 * conversion is CHED's (1 lecture unit = 1 hour, 1 laboratory unit = 3 hours), so deriving hours
 * from units that were themselves typed as hours multiplies the laboratory part by three. AP-1 is
 * recorded as 2 lecture + 3 laboratory hours — 5 a week — but carries `lecUnits 3, labUnits 3`, and
 * deriving from those gives `3 + 3×3 = 12`. The summary showed 12 and flagged a correctly plotted
 * subject as over its limit.
 *
 * Every subject in the catalog has recorded hours, so this fallback is a safety net rather than a
 * path anything relies on.
 */
export function subjectLecLabHours(subject: SubjectContactHoursInput): {
  lecHours: number;
  labHours: number;
} {
  const lec = Math.max(0, Number(subject.lecHours) || 0);
  const lab = Math.max(0, Number(subject.labHours) || 0);
  if (lec + lab > 0) return { lecHours: lec, labHours: lab };
  return {
    lecHours: lectureHoursFromUnits(subject.lecUnits),
    labHours: labHoursFromUnits(subject.labUnits),
  };
}

/** Total weekly contact hours — what the Evaluator requires a subject to be plotted for. */
export function subjectWeeklyContactHours(subject: SubjectContactHoursInput): number {
  const { lecHours, labHours } = subjectLecLabHours(subject);
  return lecHours + labHours;
}
