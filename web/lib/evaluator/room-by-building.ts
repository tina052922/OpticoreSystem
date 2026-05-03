import type { Room } from "@/types/db";

/** Stable grouping key for `Room.building` (null/blank → "Other"). */
export function roomBuildingKey(room: Pick<Room, "building">): string {
  return (room.building ?? "").trim() || "Other";
}

/** Sorted unique building labels for dropdowns (Evaluator grids). */
export function sortedBuildingLabels(rooms: Room[]): string[] {
  const keys = new Set(rooms.map(roomBuildingKey));
  return [...keys].sort((a, b) => a.localeCompare(b));
}

/** Rooms whose building key matches (after normalizing with {@link roomBuildingKey}). */
export function roomsInBuilding(rooms: Room[], buildingKey: string): Room[] {
  return rooms.filter((r) => roomBuildingKey(r) === buildingKey);
}

/**
 * Rooms in one building, ordered for dropdowns: floor ascending, then code.
 * Keeps COTE-style towers readable (e.g. COTE 101 … COTE 305) in the Room list.
 */
export function roomsInBuildingSorted(rooms: Room[], buildingKey: string): Room[] {
  const list = roomsInBuilding(rooms, buildingKey);
  return [...list].sort((a, b) => {
    const fa = a.floor ?? 0;
    const fb = b.floor ?? 0;
    if (fa !== fb) return fa - fb;
    return a.code.localeCompare(b.code);
  });
}

/** Consistent label for building→room selects (matches BSIT worksheet / campus navigation names). */
export function formatRoomOptionLabel(room: Pick<Room, "code" | "displayName">): string {
  const d = room.displayName?.trim();
  return d ? `${room.code} — ${d}` : room.code;
}
