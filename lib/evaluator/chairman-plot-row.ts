import type { BsitEvaluatorWeekday } from "@/lib/chairman/bsit-evaluator-constants";
import type { ProgramSessionWeekday } from "@/lib/scheduling/program-session";
import type { PlotLecLabMode } from "@/lib/evaluator/chairman-plot-leclab";
import {
  getLecLabPair,
  inferLecLabMode,
  lecLabModesAvailable,
} from "@/lib/evaluator/chairman-plot-leclab";

export type PlotRow = {
  id: string;
  sectionId: string;
  students: number | "";
  subjectCode: string;
  /** Lecture vs laboratory when the curriculum has separate Lec/Lab prospectus codes. */
  lecLabMode: PlotLecLabMode;
  instructorId: string;
  roomId: string;
  /** First 1-hour slot index in the active program grid (Day: 0 = 7:00 AM; Night: 0 = 7:00 AM, 11 = 6:00 PM). */
  startSlotIndex: number;
  /** Consecutive 1-hour slots for this meeting (default 1 — split contact across multiple rows). */
  durationSlots?: number;
  day: BsitEvaluatorWeekday | ProgramSessionWeekday | "";
  /** When set, DOI locked this row; the API rejects chairman writes (423) — do not upsert/delete. */
  lockedByDoiAt?: string | null;
};

export function newPlotRowId(): string {
  return typeof crypto !== "undefined" && crypto.randomUUID ? crypto.randomUUID() : `row-${Date.now()}-${Math.random()}`;
}

export type RowConflictFlags = { faculty: string; room: string; section: string };

export function emptyPlotRow(): PlotRow {
  return {
    id: newPlotRowId(),
    sectionId: "",
    students: "",
    subjectCode: "",
    lecLabMode: "lec",
    instructorId: "",
    roomId: "",
    startSlotIndex: -1,
    day: "",
    lockedByDoiAt: null,
  };
}

/**
 * Ensure plot rows carry a lecLabMode consistent with the subject.
 * - Paired curricula (CC-112 / CC-112L): derive mode from the subject code.
 * - Unpaired combined subjects: keep the explicit Lec/Lab choice when valid.
 */
export function normalizePlotRow(row: PlotRow, programCode: string): PlotRow {
  if (!row.subjectCode) {
    const lecLabMode = row.lecLabMode ?? "lec";
    return row.lecLabMode === lecLabMode ? row : { ...row, lecLabMode };
  }
  const pair = getLecLabPair(programCode, row.subjectCode);
  const paired = Boolean(pair.lecCode && pair.labCode && pair.lecCode !== pair.labCode);
  if (paired) {
    const lecLabMode = inferLecLabMode(programCode, row.subjectCode);
    return row.lecLabMode === lecLabMode ? row : { ...row, lecLabMode };
  }
  const modes = lecLabModesAvailable(programCode, row.subjectCode);
  const lecLabMode =
    row.lecLabMode && modes.includes(row.lecLabMode)
      ? row.lecLabMode
      : (modes[0] ?? "lec");
  return row.lecLabMode === lecLabMode ? row : { ...row, lecLabMode };
}
