import { normalizeSubjectSemester } from "@/lib/subjects/subject-category";
import { prospectusSemesterFromAcademicPeriod } from "@/lib/academic-period-prospectus";
import type { AcademicPeriod } from "@/types/db";

/**
 * Narrowing the saved Subject Codes list to the term chosen in the sidebar.
 *
 * There is no semester control on the page: the sidebar term is the only thing that decides, so the
 * list agrees with every other page in the shell without a second place to set it.
 */
export type SubjectSemesterFilter = "all" | "1" | "2";

/**
 * The filter that matches the term chosen in the sidebar.
 *
 * "1st Semester, AY 2026-2027" shows 1st-semester subjects. A term whose semester cannot be read
 * from its fields falls back to "all": showing everything is recoverable, hiding the wrong half
 * silently is not.
 */
export function semesterFilterForPeriod(
  period: AcademicPeriod | null | undefined,
): SubjectSemesterFilter {
  const semester = prospectusSemesterFromAcademicPeriod(period);
  if (semester === 1) return "1";
  if (semester === 2) return "2";
  return "all";
}

/**
 * Whether a subject belongs in the list for this term.
 *
 * A subject with no semester recorded is shown under **every** term, not hidden. `Subject.semester`
 * is nullable and most rows still have no value, so treating "unset" as "not this term" would make
 * the majority of the catalog unreachable — and with the filter control gone there would be no way
 * to bring them back. Unknown means unknown, so the row stays visible and can be corrected.
 */
export function subjectMatchesSemesterFilter(
  subject: { semester?: unknown },
  filter: SubjectSemesterFilter,
): boolean {
  if (filter === "all") return true;
  const semester = normalizeSubjectSemester(subject.semester);
  if (semester === null) return true;
  return semester === Number(filter);
}

export function filterSubjectsBySemester<T extends { semester?: unknown }>(
  subjects: readonly T[],
  filter: SubjectSemesterFilter,
): T[] {
  if (filter === "all") return [...subjects];
  return subjects.filter((s) => subjectMatchesSemesterFilter(s, filter));
}

/** "1st Semester" / "2nd Semester", for the line that explains why rows are missing. */
export function subjectSemesterFilterLabel(filter: SubjectSemesterFilter): string {
  if (filter === "1") return "1st Semester";
  if (filter === "2") return "2nd Semester";
  return "All semesters";
}
