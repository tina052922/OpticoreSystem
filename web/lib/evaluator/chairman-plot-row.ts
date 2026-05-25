import type { BsitEvaluatorWeekday } from "@/lib/chairman/bsit-evaluator-constants";
import type { PlotLecLabMode } from "@/lib/evaluator/chairman-plot-leclab";
import { inferLecLabMode } from "@/lib/evaluator/chairman-plot-leclab";

export type PlotRow = {
  id: string;
  sectionId: string;
  students: number | "";
  subjectCode: string;
  /** Lecture vs laboratory when the curriculum has separate Lec/Lab prospectus codes. */
  lecLabMode: PlotLecLabMode;
  instructorId: string;
  roomId: string;
  /** First 1-hour slot index (0 = 7:00–8:00 AM … 9 = 4:00–5:00 PM). */
  startSlotIndex: number;
  day: BsitEvaluatorWeekday;
  /** When set, VPAA published this row; RLS blocks chairman writes — do not upsert/delete. */
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
    startSlotIndex: 0,
    day: "Monday",
    lockedByDoiAt: null,
  };
}

/** Ensure legacy rows hydrated from DB include `lecLabMode`. */
export function normalizePlotRow(row: PlotRow, programCode: string): PlotRow {
  const lecLabMode = row.lecLabMode ?? inferLecLabMode(programCode, row.subjectCode);
  return row.lecLabMode === lecLabMode ? row : { ...row, lecLabMode };
}
