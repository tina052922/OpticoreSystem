/**
 * Duplicate detection for the Faculty Profile page.
 *
 * Faculty are identified by Employee ID (the key self-registration links on) and, as a softer guard,
 * by name within the college. Both passes must ignore the record being edited — its own Employee ID
 * and its own stored name always match what is being saved, so including it reports every edit as a
 * duplicate.
 */

export const DUPLICATE_FACULTY_MESSAGE = "Faculty already exists.";
export const MISSING_EMPLOYEE_ID_MESSAGE = "Employee ID is required.";

export type DuplicateFacultyCheckInput = {
  /** `User.id` being edited, or null when adding. */
  editingUserId: string | null;
  employeeId: string;
  /** Users the API returned for that exact Employee ID. */
  usersWithEmployeeId: { id: string }[];
  /** Instructors in the college, for the name pass. */
  collegeInstructors: { id: string; name: string }[];
  /** Their faculty profiles, which may carry a different name than `User.name`. */
  profiles: { userId: string; fullName: string | null }[];
  /** The name being saved (composed from the HR Form 23B name cells). */
  fullName: string;
};

/** Names are compared case-insensitively and with runs of whitespace collapsed. */
function key(v: string | null | undefined): string {
  return (v ?? "").replace(/\s+/g, " ").trim().toLowerCase();
}

/** The message to show, or null when the record is not a duplicate. */
export function duplicateFacultyReason(input: DuplicateFacultyCheckInput): string | null {
  if (!input.employeeId.trim()) return MISSING_EMPLOYEE_ID_MESSAGE;

  const editingUserId = input.editingUserId;
  if (input.usersWithEmployeeId.some((u) => u.id !== editingUserId)) return DUPLICATE_FACULTY_MESSAGE;

  const nameKey = key(input.fullName);
  if (!nameKey) return null;

  const hitName = input.collegeInstructors.some((u) => u.id !== editingUserId && key(u.name) === nameKey);
  if (hitName) return DUPLICATE_FACULTY_MESSAGE;

  const hitProfile = input.profiles.some(
    (p) => p.userId !== editingUserId && key(p.fullName) === nameKey,
  );
  if (hitProfile) return DUPLICATE_FACULTY_MESSAGE;

  return null;
}
