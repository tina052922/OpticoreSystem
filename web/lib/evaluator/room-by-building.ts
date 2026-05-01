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
