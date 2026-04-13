/**
 * Keeps the BSIT Chairman Evaluator worksheet in sessionStorage so INS share / inbox forward
 * can attach the same draft rows that power ScheduleEntry sync.
 */

export const EVALUATOR_SESSION_STORAGE_KEY = "opticore-bsit-evaluator-sync-v1";

export type BsitEvaluatorPlotRowSnapshot = {
  id: string;
  sectionId: string;
  students: number | "";
  subjectCode: string;
  instructorId: string;
  roomId: string;
  startSlotIndex: number;
  day: string;
};

export type EvaluatorSessionSnapshotV1 = {
  version: 1;
  academicPeriodId: string;
  collegeId: string | null;
  programId: string | null;
  rows: BsitEvaluatorPlotRowSnapshot[];
  updatedAt: string;
};

export function readEvaluatorSessionSnapshot(): EvaluatorSessionSnapshotV1 | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = sessionStorage.getItem(EVALUATOR_SESSION_STORAGE_KEY);
    if (!raw) return null;
    const v = JSON.parse(raw) as EvaluatorSessionSnapshotV1;
    if (v?.version !== 1 || !v.academicPeriodId || !Array.isArray(v.rows)) return null;
    return v;
  } catch {
    return null;
  }
}

export function writeEvaluatorSessionSnapshot(snap: EvaluatorSessionSnapshotV1) {
  if (typeof window === "undefined") return;
  try {
    sessionStorage.setItem(EVALUATOR_SESSION_STORAGE_KEY, JSON.stringify(snap));
  } catch {
    /* quota / private mode */
  }
}
