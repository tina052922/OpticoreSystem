export type FacultyRowDraft = {
  status: string;
  designation: string;
  advisorySectionIds: string[];
};

/**
 * Has this Faculty List row actually been changed?
 *
 * The list edits Status, Designation and Advisory inline, and every row carried its own Save button
 * whether or not anything had been touched. A button that usually does nothing teaches people to
 * ignore it, and it takes a column away from the data on a table that is already too wide. Save now
 * appears only on rows with an unsaved change, which also makes those rows easy to spot.
 */
export function facultyRowIsDirty(draft: FacultyRowDraft, stored: FacultyRowDraft): boolean {
  if (draft.status !== stored.status) return true;
  if (draft.designation.trim() !== stored.designation.trim()) return true;
  return !sameSectionIds(draft.advisorySectionIds, stored.advisorySectionIds);
}

/** Advisory is a set: order is not a change, and neither is a repeated id. */
export function sameSectionIds(a: readonly string[], b: readonly string[]): boolean {
  const left = new Set(a);
  const right = new Set(b);
  if (left.size !== right.size) return false;
  for (const id of left) {
    if (!right.has(id)) return false;
  }
  return true;
}

/**
 * What the Advisory cell reads when it is collapsed.
 *
 * The cell used to render a scrolling checkbox list in every row at once, which is what made the
 * table feel like a form rather than a list. Collapsed it states the answer; open it still edits.
 */
export function advisorySummaryLabel(
  sectionIds: readonly string[],
  nameById: Map<string, string>,
  opts: { max?: number } = {},
): string {
  const max = opts.max ?? 2;
  const names = sectionIds.map((id) => nameById.get(id)).filter((n): n is string => Boolean(n));
  if (names.length === 0) return "None";
  if (names.length <= max) return names.join(", ");
  return `${names.slice(0, max).join(", ")} +${names.length - max}`;
}
