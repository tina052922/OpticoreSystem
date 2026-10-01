export type ProgramScopedFaculty = {
  /** `User.chairmanProgramId` — the faculty's home department. */
  homeProgramId?: string | null;
  /** `User.facultyCategory` — GEC instructors serve every department. */
  isGecInstructor?: boolean;
  /** Section ids from `FacultyProfile.advisorySectionIds`. */
  advisorySectionIds?: readonly string[];
};

/**
 * Does this faculty belong to the department selected in Search & scope?
 *
 * The list used to answer this from advisory sections alone, with "no advisory" meaning "keep".
 * Most faculty advise nothing, so picking a department changed almost nothing — the list looked
 * frozen. The department a faculty actually belongs to is their home program; advisory is a second
 * signal for someone who has no home program recorded but does advise a section in one.
 *
 * A faculty with neither is not in any department, so a department filter hides them. They are still
 * there under "All departments", which is where an unassigned account should be noticed and fixed.
 */
export function facultyMatchesProgramScope(
  faculty: ProgramScopedFaculty,
  programId: string | null | undefined,
  sectionProgramById: Map<string, string>,
): boolean {
  const target = (programId ?? "").trim();
  if (!target) return true;

  // GEC instructors teach general education across every department, so no one department owns them.
  if (faculty.isGecInstructor) return true;

  const home = (faculty.homeProgramId ?? "").trim();
  if (home) return home === target;

  const advised = faculty.advisorySectionIds ?? [];
  if (advised.length === 0) return false;
  return advised.some((sectionId) => sectionProgramById.get(sectionId) === target);
}

/**
 * The department the Advisory (Assigned Sections) picker narrows to.
 *
 * Advisory has to answer to the same Search & scope as the faculty list, or the two disagree: the
 * list shows one department while the checkboxes offer every section in the college. The scope bar's
 * choice wins; a locked chairman program is the floor when the bar has none, which is the case on
 * the Chairman page where the bar is display-only.
 */
export function advisoryProgramFilter(
  scopeProgramId?: string | null,
  chairmanProgramId?: string | null,
): string | null {
  return (scopeProgramId ?? "").trim() || (chairmanProgramId ?? "").trim() || null;
}

/** Sections the Advisory picker may offer, given {@link advisoryProgramFilter}. */
export function sectionsInAdvisoryScope<T extends { programId: string }>(
  sections: readonly T[],
  programId: string | null,
): T[] {
  if (!programId) return [...sections];
  return sections.filter((s) => (s.programId ?? "").trim() === programId);
}
