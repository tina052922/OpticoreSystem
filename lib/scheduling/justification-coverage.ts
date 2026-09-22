/**
 * Does a recorded justification still cover a faculty's current load?
 *
 * A justification used to count for the whole term: once a row existed for an instructor, the
 * Evaluator never asked again. Clearing that faculty's plots and re-plotting them up to the prep
 * limit then produced only a notice, with no prompt — the breach was new but the old record silenced
 * it. Coverage is therefore compared against the numbers that were recorded: a load that grew past
 * what was justified needs a fresh justification.
 *
 * The recorded numbers live in `violationsSnapshot`. Rows written before this check exist without
 * them; those are treated as NOT covering, so the next breach is justified once more and the new
 * record carries the numbers.
 */

/** Tolerance for the stored hours, which are rounded to two decimals on the way in. */
const HOURS_EPSILON = 0.01;

export type RecordedJustification = {
  academicPeriodId?: string | null;
  facultyUserId?: string | null;
  justification?: string | null;
  violationsSnapshot?: unknown;
};

export type CurrentLoad = {
  instructorId: string;
  weeklyTotalContactHours: number;
  preparations: number;
};

export type JustifiedNumbers = {
  hours: number | null;
  preparations: number | null;
};

function numberOrNull(v: unknown): number | null {
  const n = typeof v === "number" ? v : Number(v);
  return Number.isFinite(n) ? n : null;
}

/**
 * The load that was justified. `facultyPreparations` is what the Chairman worksheet writes and
 * `preparations` what the GEC Central Hub writes; both are read.
 */
export function justifiedNumbersOf(justification: RecordedJustification): JustifiedNumbers {
  const snap = justification.violationsSnapshot;
  if (!snap || typeof snap !== "object") return { hours: null, preparations: null };
  const row = snap as Record<string, unknown>;
  return {
    hours: numberOrNull(row.facultyWeeklyHours),
    preparations: numberOrNull(row.facultyPreparations ?? row.preparations),
  };
}

/** True when this record already accounts for the load the faculty carries now. */
export function justificationCoversLoad(
  justification: RecordedJustification,
  load: Pick<CurrentLoad, "weeklyTotalContactHours" | "preparations">,
): boolean {
  if (!(justification.justification ?? "").trim()) return false;
  const { hours, preparations } = justifiedNumbersOf(justification);
  // Nothing recorded to compare against — ask again so the new record carries the numbers.
  if (hours == null && preparations == null) return false;
  if (preparations != null && load.preparations > preparations) return false;
  if (hours != null && load.weeklyTotalContactHours > hours + HOURS_EPSILON) return false;
  return true;
}

/**
 * Instructors whose current load is already covered by a record in this term. Anyone else who
 * breaches policy still needs the justification prompt.
 */
export function coveredFacultyIds(
  justifications: readonly RecordedJustification[],
  loads: readonly CurrentLoad[],
  academicPeriodId?: string | null,
): Set<string> {
  const loadById = new Map(loads.map((l) => [l.instructorId, l]));
  const covered = new Set<string>();
  for (const j of justifications) {
    if (academicPeriodId && j.academicPeriodId !== academicPeriodId) continue;
    const facultyId = (j.facultyUserId ?? "").trim();
    if (!facultyId || covered.has(facultyId)) continue;
    const load = loadById.get(facultyId);
    // No plots for that faculty right now: nothing to cover, and nothing to prompt about either.
    if (!load) {
      if ((j.justification ?? "").trim()) covered.add(facultyId);
      continue;
    }
    if (justificationCoversLoad(j, load)) covered.add(facultyId);
  }
  return covered;
}

/** The numbers to store with a new record, so later plotting can be compared against them. */
export function justificationLoadSnapshot(load: CurrentLoad): {
  facultyWeeklyHours: number;
  facultyPreparations: number;
} {
  return {
    facultyWeeklyHours: load.weeklyTotalContactHours,
    facultyPreparations: load.preparations,
  };
}
