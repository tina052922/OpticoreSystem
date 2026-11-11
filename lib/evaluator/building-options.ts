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

/**
 * Building-select key for rooms in no building ("Standalone Rooms" in Buildings & Rooms). They used
 * to be unreachable when plotting: the Building select only lists buildings, and the Room select only
 * opens after one is picked. Only ever UI state — it is never saved on a room or a schedule row.
 */
export const STANDALONE_ROOMS_KEY = "__standalone_rooms__";
export const STANDALONE_ROOMS_LABEL = "Standalone rooms (no building)";

/** Label for a Building-select value: the standalone group gets its own name. */
export function plotBuildingOptionLabel(value: string, fallback: (v: string) => string = (v) => v): string {
  return value === STANDALONE_ROOMS_KEY ? STANDALONE_ROOMS_LABEL : fallback(value);
}

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
  const list = buildings ?? [];
  const named = list.map((b) => (b.name ?? "").trim()).filter(Boolean);
  if (named.length === 0) {
    return sortBuildingNames([...new Set(rooms.map(roomBuildingKey))]);
  }

  /**
   * Only buildings that hold at least one room the caller may plot into. The dropdown and the room
   * list are built from the same room set on purpose: offering a building whose rooms are all out of
   * scope left the Room select empty with nothing explaining why.
   */
  const withRooms = [...new Set(named)].filter(
    (name) => roomsInBuildingNamed(rooms, name, list).length > 0,
  );
  const sorted = sortBuildingNames(withRooms);
  // Rooms in no building get one extra entry at the end, so they can be picked too.
  return rooms.some((r) => !buildingNameForRoom(r, list)) ? [...sorted, STANDALONE_ROOMS_KEY] : sorted;
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
  const list = buildings ?? [];
  if (buildingName === STANDALONE_ROOMS_KEY) {
    return rooms.filter((r) => !buildingNameForRoom(r, list));
  }

  const name = norm(buildingName);
  if (!name) return [];

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

/**
 * Building-select value for a saved room: its building's name, or {@link STANDALONE_ROOMS_KEY} for a
 * room in no building, so reopening a plot re-selects the standalone group.
 */
export function plotBuildingKeyForRoom(
  room: Pick<Room, "building" | "buildingId"> | null | undefined,
  buildings: readonly Building[] | null | undefined = [],
): string {
  if (!room) return "";
  if ((buildings ?? []).length === 0) return (room.building ?? "").trim();
  return buildingNameForRoom(room, buildings) || STANDALONE_ROOMS_KEY;
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
