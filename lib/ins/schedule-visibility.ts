/**
 * Schedule viewing policy:
 * - Faculty: own Form 5A only; may browse by section and by room.
 * - Students: own section timetable; may browse by section and by room (no faculty 5A).
 * - DOI / Program Chairman (and other admin INS shells): other faculty + section + room.
 */

export function isFacultyInsPortal(insBasePath: string): boolean {
  return insBasePath.startsWith("/faculty");
}

export function isStudentInsPortal(insBasePath: string): boolean {
  return insBasePath.startsWith("/student");
}

/** Faculty and students: view-only INS (no evaluator, conflict apply, or other-faculty 5A). */
export function isInsReadOnlyPortal(insBasePath: string): boolean {
  return isFacultyInsPortal(insBasePath) || isStudentInsPortal(insBasePath);
}

/** Students never get a faculty personal-schedule (5A) picker. */
export function showInsFacultyGrouping(insBasePath: string): boolean {
  return !isStudentInsPortal(insBasePath);
}

export function portalMyScheduleHref(insBasePath: string): string {
  return isStudentInsPortal(insBasePath) ? "/student/schedule" : "/faculty/schedule";
}
