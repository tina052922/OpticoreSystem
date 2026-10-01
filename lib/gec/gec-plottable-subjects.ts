import { normalizeProspectusCode } from "@/lib/chairman/bsit-prospectus";
import { isGecCurriculumSubjectCode } from "@/lib/gec/gec-vacant";

/**
 * Which GEC subjects the GEC Chairman may plot into a section.
 *
 * General education is taught to every program, but the `Subject` catalog stores a row per program —
 * so a program that was never seeded with GEC rows had none of its own, and the evaluator offered
 * nothing at all for its sections. The same happened when the section's program had no entry in the
 * hardcoded prospectus registry, or when its name carried no year level to match against: the
 * allowed-code set came back empty and the subject list with it. The chairman could then select the
 * section but had nothing to plot into it.
 *
 * The rule here is that the catalog and the prospectus *narrow* the choice where they have something
 * to say, and never reduce it to nothing:
 *
 *  1. Start from every GEC/GEE subject on campus, one per code, preferring the section's own
 *     program's row so program-specific units and titles win where they exist.
 *  2. If the prospectus named codes for this program and year, keep those.
 *  3. If either step would leave the list empty, fall back to the wider one — an empty dropdown is
 *     never the more useful answer for the person whose job is placing these subjects.
 */
export type GecPlottableSubject = {
  id: string;
  code: string;
  programId?: string | null;
};

/** One row per GEC code, the section's own program preferred, then stable by program id. */
function oneRowPerCode<T extends GecPlottableSubject>(
  subjects: readonly T[],
  sectionProgramId: string | null,
): T[] {
  const own = (sectionProgramId ?? "").trim();
  const byCode = new Map<string, T>();

  for (const s of subjects) {
    if (!isGecCurriculumSubjectCode(s.code)) continue;
    const code = normalizeProspectusCode(s.code);
    const current = byCode.get(code);
    if (!current) {
      byCode.set(code, s);
      continue;
    }
    const currentIsOwn = own !== "" && (current.programId ?? "").trim() === own;
    if (currentIsOwn) continue;

    const candidateIsOwn = own !== "" && (s.programId ?? "").trim() === own;
    // Otherwise keep it deterministic, so the same row wins on every render.
    if (candidateIsOwn || (s.programId ?? "") < (current.programId ?? "")) {
      byCode.set(code, s);
    }
  }

  return [...byCode.values()].sort((a, b) => a.code.localeCompare(b.code));
}

export function gecSubjectsForSectionPlot<T extends GecPlottableSubject>(
  subjects: readonly T[],
  opts: {
    /** The program the section belongs to; its own GEC rows are preferred. */
    sectionProgramId: string | null;
    /**
     * Normalized GEC codes the prospectus lists for this program and year level.
     *
     * Empty means "the prospectus had nothing to say" — not "nothing is allowed".
     */
    allowedProspectusCodes?: ReadonlySet<string> | null;
  },
): T[] {
  const pool = oneRowPerCode(subjects, opts.sectionProgramId);
  const codes = opts.allowedProspectusCodes;
  if (!codes || codes.size === 0) return pool;

  const narrowed = pool.filter((s) => codes.has(normalizeProspectusCode(s.code)));
  // A prospectus code with no catalog row behind it must not empty the list.
  return narrowed.length > 0 ? narrowed : pool;
}

/** The same set, by subject id, for callers that test membership rather than render a list. */
export function gecPlottableSubjectIds<T extends GecPlottableSubject>(
  subjects: readonly T[],
  opts: Parameters<typeof gecSubjectsForSectionPlot<T>>[1],
): Set<string> {
  return new Set(gecSubjectsForSectionPlot(subjects, opts).map((s) => s.id));
}
