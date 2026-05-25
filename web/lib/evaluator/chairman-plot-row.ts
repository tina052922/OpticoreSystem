import type { BsitEvaluatorWeekday } from "@/lib/chairman/bsit-evaluator-constants";

export type PlotRow = {
  id: string;
  sectionId: string;
  students: number | "";
  subjectCode: string;
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

export function emptyPlotRow(): PlotRow {
  return {
    id: newPlotRowId(),
    sectionId: "",
    students: "",
    subjectCode: "",
    instructorId: "",
    roomId: "",
    startSlotIndex: 0,
    day: "Monday",
    lockedByDoiAt: null,
  };
}
