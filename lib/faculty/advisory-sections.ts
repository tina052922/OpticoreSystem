/**
 * Advisory sections on a faculty profile.
 *
 * `advisorySectionIds` (migration 014) is the list; `advisorySectionId` is kept in sync with its first
 * entry so older readers — the faculty dashboard and the portal payload — keep working. Everything that
 * writes advisory data goes through `advisoryWriteFields` so the two can never drift apart.
 */

export type AdvisoryCarrier = {
  advisorySectionId?: string | null;
  advisorySectionIds?: string[] | null;
};

/** The advisory sections of a profile, de-duplicated, with the legacy single value folded in. */
export function advisorySectionIdsOf(profile: AdvisoryCarrier | null | undefined): string[] {
  const out: string[] = [];
  const push = (v: string | null | undefined) => {
    const id = (v ?? "").trim();
    if (id && !out.includes(id)) out.push(id);
  };
  for (const id of profile?.advisorySectionIds ?? []) push(id);
  push(profile?.advisorySectionId);
  return out;
}

/** The two columns to write for a given selection, always consistent. */
export function advisoryWriteFields(sectionIds: readonly string[]): {
  advisorySectionIds: string[];
  advisorySectionId: string | null;
} {
  const ids: string[] = [];
  for (const raw of sectionIds) {
    const id = (raw ?? "").trim();
    if (id && !ids.includes(id)) ids.push(id);
  }
  return { advisorySectionIds: ids, advisorySectionId: ids[0] ?? null };
}

/** True when the profile advises that section. */
export function advisesSection(
  profile: AdvisoryCarrier | null | undefined,
  sectionId: string | null | undefined,
): boolean {
  const id = (sectionId ?? "").trim();
  if (!id) return false;
  return advisorySectionIdsOf(profile).includes(id);
}

/** "BSIT 1-A, BSIT 2-B" for list cells; `fallback` when the faculty advises nothing. */
export function advisoryLabel(
  profile: AdvisoryCarrier | null | undefined,
  sectionNameById: Map<string, string> | Record<string, string>,
  fallback = "—",
): string {
  const lookup = (id: string): string =>
    sectionNameById instanceof Map ? (sectionNameById.get(id) ?? id) : (sectionNameById[id] ?? id);
  const names = advisorySectionIdsOf(profile).map(lookup).filter(Boolean);
  return names.length > 0 ? names.join(", ") : fallback;
}
