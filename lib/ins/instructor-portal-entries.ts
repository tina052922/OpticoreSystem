export type InsEntryLike = {
  sectionId: string;
  instructorId?: string | null;
};

/**
 * Narrowing INS schedule rows for the faculty portal.
 *
 * Two different questions, and they were being conflated:
 *
 *   - "Which sections does this instructor teach?" — used to decide which sections and rooms are
 *     worth offering in a picker. Keeping every row of those sections is right there, because a
 *     section grid is only readable if it shows the whole section.
 *   - "Which classes are this instructor's?" — the answer for a page that is titled *My schedule*.
 *     Here the co-teachers of a shared section are somebody else's business.
 *
 * `ownEntriesOnly` chooses. Without it, a faculty member opening the section view of a section they
 * teach also reads every colleague's class in that section.
 */
export function instructorPortalEntries<T extends InsEntryLike>(args: {
  entries: readonly T[];
  /**
   * Rows used to work out which sections the instructor teaches. Defaults to `entries`; the callers
   * that scope to the current term pass that narrower list so a section taught in an earlier term
   * does not widen this one.
   */
  teachingSource?: readonly T[];
  instructorUserId: string | null | undefined;
  ownEntriesOnly?: boolean;
}): T[] {
  const uid = (args.instructorUserId ?? "").trim();
  // No instructor to narrow to: this is not a portal view, so nothing is withheld.
  if (!uid) return [...args.entries];

  if (args.ownEntriesOnly) {
    return args.entries.filter((e) => e.instructorId === uid);
  }

  const source = args.teachingSource ?? args.entries;
  const teachingSectionIds = new Set(
    source.filter((e) => e.instructorId === uid).map((e) => e.sectionId),
  );
  if (teachingSectionIds.size === 0) return [];
  return args.entries.filter((e) => teachingSectionIds.has(e.sectionId));
}
