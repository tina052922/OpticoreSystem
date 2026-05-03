import type { Room } from "@/types/db";

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
