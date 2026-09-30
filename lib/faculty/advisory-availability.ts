export type AdvisoryAssignment = {
  userId: string;
  /** Shown to explain why a section cannot be picked. */
  name: string;
  sectionIds: readonly string[];
};

export type AdvisoryHolder = { userId: string; name: string };

/**
 * Who already advises each section.
 *
 * A section has one adviser. Nothing stopped two faculty being ticked for the same section, and the
 * result is silent: both profiles claim it, and whichever list you read last looks right. So the
 * pickers now show a taken section as taken instead of letting it be chosen twice.
 *
 * `excludeUserId` is the faculty being edited — their own sections must stay tickable, or opening a
 * profile would show its own advisory as unavailable and un-ticking would be the only way forward.
 *
 * Callers pass the values currently on screen, not the stored ones, so a section ticked in one row
 * reads as taken in the others straight away.
 */
export function advisoryHoldersBySection(
  assignments: readonly AdvisoryAssignment[],
  opts: { excludeUserId?: string | null } = {},
): Map<string, AdvisoryHolder> {
  const exclude = (opts.excludeUserId ?? "").trim();
  const held = new Map<string, AdvisoryHolder>();
  for (const a of assignments) {
    if (!a.userId || (exclude && a.userId === exclude)) continue;
    for (const sectionId of a.sectionIds) {
      const id = String(sectionId ?? "").trim();
      if (!id) continue;
      // First claim wins, so the label stays stable rather than flipping between two names.
      if (!held.has(id)) held.set(id, { userId: a.userId, name: a.name });
    }
  }
  return held;
}

/**
 * Can this faculty still be given this section?
 *
 * Already being their own is always allowed: that is what un-ticking needs.
 */
export function canAssignAdvisorySection(
  sectionId: string,
  args: { holders: Map<string, AdvisoryHolder>; alreadySelected: boolean },
): boolean {
  if (args.alreadySelected) return true;
  return !args.holders.has(sectionId);
}

/** Why a section is not selectable, in words rather than a disabled box with no explanation. */
export function advisoryTakenLabel(holder: AdvisoryHolder | undefined): string {
  if (!holder) return "";
  return `Already advised by ${holder.name || "another faculty"}`;
}
