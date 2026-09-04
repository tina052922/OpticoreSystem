import type { Room } from "@/types/db";

/**
 * Canonical campus-navigation room id ↔ legacy college seed id for the same physical space.
 * Pairwise only (IT Lab 4 ≡ IT LAB 4, never Lab 4 ≡ Lab 1).
 */
const PHYSICAL_ROOM_ALIASES: ReadonlyArray<readonly [canonicalId: string, legacyId: string]> = [
  ["room-cote-302", "room-it-lab-1"],
  ["room-cote-303", "room-it-lab-2"],
  ["room-cote-304", "room-it-lab-3"],
  ["room-cote-305", "room-it-lab-4"],
  ["room-coed-201", "room-201"],
];

const PHYSICAL_ROOM_CANON_BY_ID = (() => {
  const m = new Map<string, string>();
  for (const [canonical, legacy] of PHYSICAL_ROOM_ALIASES) {
    m.set(canonical, canonical);
    m.set(legacy, canonical);
  }
  return m;
})();

/** Same classroom when one row still uses a legacy `Room.id` and the plotter uses the COTE/COED id. */
export function canonicalRoomIdForConflicts(roomId: string | null | undefined): string | null {
  const id = roomId?.trim();
  if (!id) return null;
  return PHYSICAL_ROOM_CANON_BY_ID.get(id) ?? id;
}

export function roomsAreSamePhysicalSpace(
  a: string | null | undefined,
  b: string | null | undefined,
): boolean {
  const left = canonicalRoomIdForConflicts(a);
  const right = canonicalRoomIdForConflicts(b);
  return Boolean(left && right && left === right);
}

/**
 * When the campus navigation seed rows (canonical `id`s) are present in the same catalog fetch as older
 * college-only duplicates, hide the legacy rows so Building → Room lists match `/campus-navigation-standalone.html`.
 *
 * Legacy rows remain in Postgres for existing `ScheduleEntry.roomId` FKs.
 */
type DedupeRule = { canonicalIds: readonly string[]; legacyIds: readonly string[] };

const CAMPUS_NAV_ROOM_DEDUPE_RULES: DedupeRule[] = [
  {
    canonicalIds: ["room-cote-302", "room-cote-303", "room-cote-304", "room-cote-305"],
    legacyIds: ["room-it-lab-1", "room-it-lab-2", "room-it-lab-3", "room-it-lab-4"],
  },
  {
    canonicalIds: ["room-coed-201"],
    legacyIds: ["room-201"],
  },
];

export function alignCampusNavigationRoomCatalog(rooms: Room[]): Room[] {
  let out = rooms;
  for (const rule of CAMPUS_NAV_ROOM_DEDUPE_RULES) {
    const hasCanonical = rule.canonicalIds.some((id) => out.some((r) => r.id === id));
    if (!hasCanonical) continue;
    const legacy = new Set(rule.legacyIds);
    out = out.filter((r) => !legacy.has(r.id));
  }
  return out;
}

/** @deprecated Use {@link alignCampusNavigationRoomCatalog} */
export function dedupeLegacyItLabsForCampusNavigation(rooms: Room[]): Room[] {
  return alignCampusNavigationRoomCatalog(rooms);
}
