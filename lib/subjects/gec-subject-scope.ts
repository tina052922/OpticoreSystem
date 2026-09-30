/**
 * Which subjects the GEC Chairman may change.
 *
 * The GEC Chairman sees the whole campus catalog, because general education subjects are taught
 * across every department and the surrounding rows are the context that makes the list useful. What
 * they may *edit* is narrower: the general education subjects themselves. A major subject belongs to
 * its own department's chairman.
 *
 * Mirrored from `opticore-backend/src/lib/gec-subject-scope.ts`; the two files are kept identical so
 * the browser hides exactly what the server refuses. The server re-checks every write — this copy
 * decides what to show, never what is allowed.
 */

export type GecScopedSubject = {
  code?: string | null;
  /** `Subject.category` (migration 016). */
  category?: string | null;
};

/** CHED-style general education prefixes. */
export function hasGecSubjectCodePrefix(code: string | null | undefined): boolean {
  const u = String(code ?? "").trim().toUpperCase();
  return u.startsWith("GEC-") || u.startsWith("GEE-");
}

/**
 * Is this an existing subject the GEC Chairman owns?
 *
 * Either signal is enough: the code prefix, or a stored category of `gec` for the general education
 * subjects whose codes do not follow the CHED prefix convention.
 */
export function isGecEditableSubject(subject: GecScopedSubject): boolean {
  if (hasGecSubjectCodePrefix(subject.code)) return true;
  return String(subject.category ?? "").trim().toLowerCase() === "gec";
}

/**
 * May the GEC Chairman create a subject with this code?
 *
 * Creation is judged on the CODE ALONE, deliberately. `category` travels in the request body, so
 * accepting it here would let the chairman mark any new subject `gec` and file it under another
 * department. The prefix is not something they can claim after the fact.
 */
export function canGecChairmanCreateSubjectCode(code: string | null | undefined): boolean {
  return hasGecSubjectCodePrefix(code);
}

/**
 * May the GEC Chairman change or remove this subject?
 *
 * `existing` must be the row as STORED, never the incoming payload. Judging it on the request would
 * let a chairman send `category: "gec"` alongside an edit to a major subject and be granted the very
 * permission being checked.
 *
 * `nextCode` is the code the edit would leave behind: a subject may not be renamed out of GEC scope,
 * which would otherwise be a way to take a subject from another department by two edits.
 */
export function canGecChairmanWriteSubject(
  existing: GecScopedSubject,
  nextCode?: string | null,
): boolean {
  if (!isGecEditableSubject(existing)) return false;
  const next = String(nextCode ?? "").trim();
  if (!next) return true;
  return hasGecSubjectCodePrefix(next);
}

/** The refusal a GEC Chairman sees, in their words rather than the rule's. */
export const GEC_SUBJECT_SCOPE_MESSAGE =
  "GEC Chairman can only add or change general education subjects (codes starting with GEC- or GEE-).";
