/**
 * Static prospectus catalog keyed by **program code** (e.g. `BSIT`, `BSCS`).
 *
 * How to add a new program:
 * 1. Create `lib/chairman/prospectus-<code>.ts` (or append) exporting `ProspectusSubjectRow[]` with the official curriculum.
 * 2. Import it here and add an entry to `PROGRAM_PROSPECTUS_SUBJECTS` using the same `Program.code` value as in Supabase (case-insensitive lookup).
 *
 * The GEC Central Hub summary, slot durations, and previews use the **selected section’s program** via
 * `getProspectusSubjectsForProgram` / `prospectusRowForProgram`. Subject Codes and chairman tools resolve the same catalog via program code.
 */

import {
  BSIT_PROGRAM_CODE,
  BSIT_PROSPECTUS_SUBJECTS,
  normalizeProspectusCode,
  prospectusSubjectsForYearAndSemester,
  prospectusSubjectsForYearLevel,
  scheduleDurationSlots,
  type BsitSemester,
  type ProspectusSubjectRow,
} from "@/lib/chairman/bsit-prospectus";
import {
  BSENVS_PROGRAM_CODE,
  BSENVS_PROSPECTUS_SUBJECTS,
  prospectusSubjectsForBsenvsYearAndSemester,
  prospectusSubjectsForBsenvsYearLevel,
} from "@/lib/chairman/bs-envsci-prospectus";
import type { Subject } from "@/types/db";

/**
 * Map: uppercase program code → official prospectus rows.
 * Extend this object when new curricula are onboarded.
 */
export const PROGRAM_PROSPECTUS_SUBJECTS: Readonly<Record<string, readonly ProspectusSubjectRow[]>> = {
  [BSIT_PROGRAM_CODE.toUpperCase()]: BSIT_PROSPECTUS_SUBJECTS,
  [BSENVS_PROGRAM_CODE.toUpperCase()]: BSENVS_PROSPECTUS_SUBJECTS,
};

/** Program codes that have a static prospectus in this registry. */
export function getRegisteredProgramCodes(): string[] {
  return Object.keys(PROGRAM_PROSPECTUS_SUBJECTS);
}

function normalizeProgramKey(programCode: string | null | undefined): string {
  return (programCode ?? "").trim().toUpperCase();
}

/** All prospectus rows for a program, or empty if none registered. */
export function getProspectusSubjectsForProgram(programCode: string | null | undefined): ProspectusSubjectRow[] {
  const k = normalizeProgramKey(programCode);
  if (!k) return [];
  const rows = PROGRAM_PROSPECTUS_SUBJECTS[k];
  return rows ? [...rows] : [];
}

/** True when we have a static curriculum slice for this program code. */
export function hasProspectusForProgram(programCode: string | null | undefined): boolean {
  return getProspectusSubjectsForProgram(programCode).length > 0;
}

/** Look up one course in that program’s static prospectus (not cross-program). */
export function prospectusRowForProgram(
  programCode: string | null | undefined,
  subjectCode: string,
): ProspectusSubjectRow | undefined {
  const norm = normalizeProspectusCode(subjectCode);
  for (const s of getProspectusSubjectsForProgram(programCode)) {
    if (normalizeProspectusCode(s.code) === norm) return s;
  }
  return undefined;
}

/** Prospectus slice for Evaluator subject dropdowns (year × semester). */
export function prospectusSubjectsForProgramYearAndSemester(
  programCode: string | null | undefined,
  yearLevel: number,
  semester: BsitSemester,
): ProspectusSubjectRow[] {
  const k = normalizeProgramKey(programCode);
  if (k === BSENVS_PROGRAM_CODE.toUpperCase()) {
    return prospectusSubjectsForBsenvsYearAndSemester(yearLevel, semester);
  }
  return prospectusSubjectsForYearAndSemester(yearLevel, semester);
}

export function prospectusSubjectsForProgramYearLevel(
  programCode: string | null | undefined,
  yearLevel: number,
): ProspectusSubjectRow[] {
  const k = normalizeProgramKey(programCode);
  if (k === BSENVS_PROGRAM_CODE.toUpperCase()) {
    return prospectusSubjectsForBsenvsYearLevel(yearLevel);
  }
  return prospectusSubjectsForYearLevel(yearLevel);
}

/**
 * Slot span for the evaluator grid (1-hour slots): uses program prospectus when available, else DB subject hours.
 */
export function scheduleSlotDurationForSubject(
  programCode: string | null | undefined,
  subject: Subject | undefined,
): number {
  if (!subject?.code) return 1;
  const row = prospectusRowForProgram(programCode, subject.code);
  if (row) return scheduleDurationSlots(row);
  return Math.max(1, Math.min(10, Math.round((subject.lecHours ?? 1) / 1)));
}
