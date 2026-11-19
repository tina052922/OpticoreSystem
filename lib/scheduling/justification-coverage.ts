/**
 * Does a recorded justification cover a faculty's load?
 *
 * Once per faculty per term. When a faculty first goes over the preparation (or hours) limit, the
 * scheduler asks for a justification; after it is recorded it is never asked for again that term,
 * whatever is plotted next. Comparing against the recorded numbers made every further class re-open
 * the prompt, so the same reason had to be typed over and over.
 *
 * DOI can clear a record (Summary of Teaching Load); the next breach then asks again. The numbers in
 * `violationsSnapshot` are still stored, for the record and for DOI to read.
 */

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
 * The load that was justified. `facultyPreparations` is what the Chairperson worksheet writes and
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
  // Kept for callers; the load no longer matters once a reason is on record for the term.
  _load?: Pick<CurrentLoad, "weeklyTotalContactHours" | "preparations">,
): boolean {
  return Boolean((justification.justification ?? "").trim());
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
