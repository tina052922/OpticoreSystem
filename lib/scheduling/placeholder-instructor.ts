import { GEC_VACANT_INSTRUCTOR_USER_ID } from "@/lib/gec/gec-vacant";

/**
 * "Prof X (TBA)" — plot a subject before anyone handles it (post still for hire, instructor left).
 *
 * One fixed `User` row (migration 026, renamed by 033), shared by every scheduler. It is not a
 * person: never a schedule conflict, never counted for load or prep limits, kept off faculty lists.
 */
export const PLACEHOLDER_INSTRUCTOR_ID = GEC_VACANT_INSTRUCTOR_USER_ID;
export const PLACEHOLDER_INSTRUCTOR_LABEL = "Prof X (TBA)";

export function isPlaceholderInstructorId(id: string | null | undefined): boolean {
  return String(id ?? "").trim() === PLACEHOLDER_INSTRUCTOR_ID;
}
