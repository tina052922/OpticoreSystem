import { getProspectusSubjectsForProgram, hasProspectusForProgram } from "@/lib/chairman/prospectus-registry";
import { isGecCurriculumSubjectCode } from "@/lib/gec/gec-vacant";

/**
 * Whether a section has any GEC subject in the scope the evaluator plots it under.
 *
 * This is the rule the "Summary of Subjects (GEC)" panel already applies — the program's prospectus
 * rows, narrowed to the section's year level and the term's semester, keeping only GEC/GEE codes.
 * Mirroring it here is the point: a section the summary calls empty is one the GEC Chairman has
 * nothing to do with, so it should not be in the Section picker at all. BSIT-4B is the example —
 * fourth year carries no general education, and offering it only leads to an empty workspace.
 *
 * A program with no prospectus on file is a different state, and the summary says so in its own
 * words ("No static prospectus for program code …"). Nothing is known about its general education
 * there, so its sections are kept rather than hidden on a guess.
 */
export function sectionHasGecSubjectsInScope(args: {
  programCode?: string | null;
  /** From the section name, e.g. BSIT-4B → 4. Null when it carries none; then no year narrows it. */
  yearLevel?: number | null;
  /** The term's prospectus semester. Null when the term name does not say; then both count. */
  semester?: 1 | 2 | null;
}): boolean {
  const programCode = (args.programCode ?? "").trim();
  if (!programCode) return true;
  if (!hasProspectusForProgram(programCode)) return true;

  return getProspectusSubjectsForProgram(programCode).some((row) => {
    if (!isGecCurriculumSubjectCode(row.code)) return false;
    if (args.yearLevel != null && row.yearLevel !== args.yearLevel) return false;
    if (args.semester != null && row.semester !== args.semester) return false;
    return true;
  });
}
