import { isGecCurriculumSubjectCode } from "@/lib/gec/gec-vacant";

/**
 * Which schedule rows feed the Load Generator's Faculty / Section / Room pickers.
 *
 * Each picker is built from the rows in scope, so whatever this returns is exactly what the person
 * signed in can choose from. The three audiences:
 *
 *   • **DOI** — campus-wide, every college.
 *   • **College Admin / Chairman** — their college, narrowed to their department when they have one.
 *   • **GEC Chairman** — general education across every college, and nothing else.
 *
 * The Faculty picker already applied the college rule; Section and Room did not, and ran campus-wide
 * for everyone — a College Admin's Room list held other colleges' rooms. The GEC rule did not exist
 * at all, so the GEC Chairman saw the whole campus.
 */
export type InsEntityScope = {
  /** DOI: everything. Wins over the others. */
  campusWide?: boolean;
  /** GEC Chairman: general education only, in every college. */
  gecOnly?: boolean;
  collegeId?: string | null;
  /** Chairman: narrows within the college. */
  programId?: string | null;
};

export type InsScopeLookups = {
  sectionById: ReadonlyMap<string, { programId: string }>;
  programById: ReadonlyMap<string, { collegeId?: string | null }>;
  /** Only needed for `gecOnly`; a row whose subject is unknown cannot be shown to be GEC. */
  subjectById?: ReadonlyMap<string, { code: string }>;
};

export type InsScopableEntry = {
  sectionId: string;
  subjectId?: string | null;
};

/** True when this row belongs to a general education subject. */
export function isGecEntry(
  entry: InsScopableEntry,
  subjectById?: ReadonlyMap<string, { code: string }>,
): boolean {
  const subject = subjectById?.get((entry.subjectId ?? "").trim());
  return Boolean(subject && isGecCurriculumSubjectCode(subject.code));
}

export function filterInsEntriesForScope<T extends InsScopableEntry>(
  entries: readonly T[],
  scope: InsEntityScope,
  lookups: InsScopeLookups,
): T[] {
  const gecOnly = Boolean(scope.gecOnly);
  const collegeId = (scope.collegeId ?? "").trim();
  const programId = (scope.programId ?? "").trim();

  return entries.filter((e) => {
    // General education is taught in every college, so it is filtered by subject, not by college.
    if (gecOnly) return isGecEntry(e, lookups.subjectById);
    if (scope.campusWide) return lookups.sectionById.has(e.sectionId);
    if (!collegeId) return true;

    const section = lookups.sectionById.get(e.sectionId);
    if (!section) return false;
    const program = lookups.programById.get(section.programId);
    if (!program) return false;
    if ((program.collegeId ?? "") !== collegeId) return false;
    if (programId && section.programId !== programId) return false;
    return true;
  });
}
