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

  /*
   * The department filter narrows to that department's people: a faculty with a home program is
   * listed under it only — General Subject and "both" instructors included (an Uy of BSENVS is not
   * BSIT's). Without a home program, the advised sections decide. "All" (no target) lists everyone.
   */
  void faculty.isGecInstructor;
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

/**
 * Sections one instructor's Advisory picker offers. Program faculty are limited to their home
 * program (a BSIT instructor is not offered BSIE sections); GEC and both-category faculty may
 * advise across programs. A leftover from another program is dropped on save
 * ({@link advisoryIdsWithinProgram}).
 */
export function advisorySectionsForInstructor<T extends { id: string; programId: string }>(
  sections: readonly T[],
  instructorProgramId: string | null | undefined,
  allowsCrossProgram: boolean = false,
): T[] {
  if (allowsCrossProgram) return [...sections];
  const programId = (instructorProgramId ?? "").trim();
  if (!programId) return [];
  return sections.filter((s) => (s.programId ?? "").trim() === programId);
}

/** True when the section belongs to a program other than the instructor's (never for no program). */
export function sectionOutsideProgram(
  section: { programId: string },
  instructorProgramId: string | null | undefined,
): boolean {
  const programId = (instructorProgramId ?? "").trim();
  if (!programId) return false;
  return (section.programId ?? "").trim() !== programId;
}

/**
 * The advisory ids an instructor may keep: their own program's sections only. A BSIT instructor
 * advising a BSIE section was possible before, so saving drops any such leftover. Ids not in
 * `sections` are kept (the server checks them).
 */
export function advisoryIdsWithinProgram(
  sections: readonly { id: string; programId: string }[],
  instructorProgramId: string | null | undefined,
  ids: readonly string[],
): string[] {
  const byId = new Map(sections.map((s) => [s.id, s]));
  return ids.filter((id) => {
    const sec = byId.get(id);
    return !sec || !sectionOutsideProgram(sec, instructorProgramId);
  });
}
