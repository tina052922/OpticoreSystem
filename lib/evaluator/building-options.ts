/**
 * Building choices for the plot modals.
 *
 * The list used to be derived from the `Room.building` text column, so a building deleted in
 * Buildings & Rooms kept appearing for as long as any room row still carried its name. The
 * `Building` table is the record of what exists, so it decides what is offered: a name that is not
 * in the table is not listed, whatever leftover text the rooms hold.
 *
 * Rooms are matched to a building by `Room.buildingId` first, and by the building's name for rooms
 * saved before that column existed (Buildings & Rooms keeps the name in sync on rename).
 *
 * When the table is empty or not installed yet (migration 010), the old text grouping is used so
 * plotting keeps working on an un-migrated database.
 */

import type { Building, Room } from "@/types/db";
import { roomBuildingKey } from "@/lib/evaluator/room-by-building";
import { CAMPUS_NAVIGATION_BUILDING_SORT_ORDER } from "@/lib/campus/campus-navigation-catalog";

function norm(v: string | null | undefined): string {
  return (v ?? "").replace(/\s+/g, " ").trim().toLowerCase();
}

/** Campus-navigation order first, then A–Z — the order the grids already show. */
function sortBuildingNames(names: string[]): string[] {
  return [...names].sort((a, b) => {
    const ia = CAMPUS_NAVIGATION_BUILDING_SORT_ORDER.indexOf(a);
    const ib = CAMPUS_NAVIGATION_BUILDING_SORT_ORDER.indexOf(b);
    const ra = ia === -1 ? 1_000 : ia;
    const rb = ib === -1 ? 1_000 : ib;
    if (ra !== rb) return ra - rb;
    return a.localeCompare(b);
  });
}

/**
 * Buildings that may be picked when plotting: the `Building` table when it has rows, else the
 * distinct `Room.building` values (un-migrated database).
 */
export function buildingNamesForPlotting(
  buildings: readonly Building[] | null | undefined,
  rooms: readonly Room[],
): string[] {
  const named = (buildings ?? []).map((b) => (b.name ?? "").trim()).filter(Boolean);
  if (named.length > 0) return sortBuildingNames([...new Set(named)]);
  return sortBuildingNames([...new Set(rooms.map(roomBuildingKey))]);
}

/**
 * Rooms inside the named building: attached by `buildingId`, plus rooms whose own building text
 * matches. Rooms left pointing at a deleted building match neither and are not offered.
 */
export function roomsInBuildingNamed(
  rooms: readonly Room[],
  buildingName: string | null | undefined,
  buildings: readonly Building[] | null | undefined = [],
): Room[] {
  const name = norm(buildingName);
  if (!name) return [];

  const list = buildings ?? [];
  const ids = new Set(list.filter((b) => norm(b.name) === name).map((b) => b.id));
  // With a Building table in hand, only a building it knows can claim rooms. This is what keeps a
  // deleted building (its name still sitting on room rows) from coming back.
  if (list.length > 0 && ids.size === 0) return [];
  const knownIds = new Set(list.map((b) => b.id));

  return rooms.filter((r) => {
    const roomBuildingId = (r.buildingId ?? "").trim();
    if (roomBuildingId && knownIds.size > 0) {
      // Attached to a building: only its own building claims it.
      return ids.has(roomBuildingId);
    }
    return norm(r.building) === name;
  });
}

/** Rooms in one building, ordered for dropdowns: floor ascending, then code. */
export function sortedRoomsInBuildingNamed(
  rooms: readonly Room[],
  buildingName: string | null | undefined,
  buildings: readonly Building[] | null | undefined = [],
): Room[] {
  return [...roomsInBuildingNamed(rooms, buildingName, buildings)].sort((a, b) => {
    const fa = a.floor ?? 0;
    const fb = b.floor ?? 0;
    if (fa !== fb) return fa - fb;
    return a.code.localeCompare(b.code);
  });
}

/** The building a saved room belongs to, for pre-selecting the dropdown; `""` when it has none. */
export function buildingNameForRoom(
  room: Pick<Room, "building" | "buildingId"> | null | undefined,
  buildings: readonly Building[] | null | undefined = [],
): string {
  if (!room) return "";
  const roomBuildingId = (room.buildingId ?? "").trim();
  if (roomBuildingId) {
    const match = (buildings ?? []).find((b) => b.id === roomBuildingId);
    if (match?.name) return match.name;
  }
  const text = (room.building ?? "").trim();
  if (!text) return "";
  // Only report a name the table still has; a deleted building must not come back through the text.
  const list = buildings ?? [];
  if (list.length === 0) return text;
  return list.some((b) => norm(b.name) === norm(text)) ? text : "";
}
