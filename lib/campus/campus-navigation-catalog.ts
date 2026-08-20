/**
 * Campus navigation / building–room structure for OptiCore (CTU Argao).
 *
 * Canonical room rows live in Postgres `public."Room"` (seeded from
 * `supabase/seed.sql`, `supabase/seed_ctu_argao_campus_rooms.sql`, and related
 * migrations). Navigation images use `Room.imagePath` under `public/campus/navigation/`.
 *
 * This module groups **live** `Room` records by `building` so Evaluator, INS, and
 * other UIs share one cascading pattern without duplicating the full seed list.
 */

import type { Room } from "@/types/db";

import { roomBuildingKey } from "@/lib/evaluator/room-by-building";

/**
 * Building order aligned with CTU Argao campus navigator flow (gate area → academic core → colleges).
 * Keys must match `Room.building` strings from seed/migrations. Unknown buildings sort after this list (A–Z).
 */
export const CAMPUS_NAVIGATION_BUILDING_SORT_ORDER: readonly string[] = [
  "Admin Building",
  "COED Building",
  "Science and Technology Building",
  "COTE Building",
  "Agriculture Building",
  "ACAD Bldg. Pres. Diosdado Macapagal Academic",
  "Library",
  "Chapel",
  "Mini Hotel",
  "HM Department",
  "Biodiversity",
  "Shared Service Facility for Handbloom Weaving",
  "Other",
];

/** Dropdown label for a building key (value stays DB `Room.building` for filtering). */
export function campusNavigationBuildingOptionLabel(buildingKey: string): string {
  if (buildingKey === "Science and Technology Building") return "Science & Technology Building";
  if (buildingKey === "ACAD Bldg. Pres. Diosdado Macapagal Academic") return "ACAD Building (Pres. Diosdado Macapagal Academic)";
  return buildingKey;
}

/** Distinct building keys from `rooms`, ordered like the campus navigation module (not plain A–Z). */
export function sortedNavigationBuildingKeysFromRooms(rooms: Room[]): string[] {
  const keys = [...new Set(rooms.map(roomBuildingKey))];
  keys.sort((a, b) => {
    const ia = CAMPUS_NAVIGATION_BUILDING_SORT_ORDER.indexOf(a);
    const ib = CAMPUS_NAVIGATION_BUILDING_SORT_ORDER.indexOf(b);
    const ra = ia === -1 ? 1_000 : ia;
    const rb = ib === -1 ? 1_000 : ib;
    if (ra !== rb) return ra - rb;
    return a.localeCompare(b);
  });
  return keys;
}

export type CampusBuildingGroup = {
  /** Same key as {@link roomBuildingKey} (blank building → `"Other"`). */
  buildingKey: string;
  rooms: Room[];
};

/**
 * Group rooms by normalized building label, sort buildings alphabetically, and
 * sort rooms within each building by floor then code (matches campus maps / tower order).
 */
export function groupRoomsByBuilding(rooms: Room[]): CampusBuildingGroup[] {
  const byBuilding = new Map<string, Room[]>();
  for (const r of rooms) {
    const key = roomBuildingKey(r);
    const list = byBuilding.get(key);
    if (list) list.push(r);
    else byBuilding.set(key, [r]);
  }
  const keys = sortedNavigationBuildingKeysFromRooms(rooms);
  return keys.map((buildingKey) => {
    const list = byBuilding.get(buildingKey) ?? [];
    const roomsSorted = [...list].sort((a, b) => {
      const fa = a.floor ?? 0;
      const fb = b.floor ?? 0;
      if (fa !== fb) return fa - fb;
      return a.code.localeCompare(b.code);
    });
    return { buildingKey, rooms: roomsSorted };
  });
}

/** Sorted building keys for cascading “Building” dropdowns (same order as {@link groupRoomsByBuilding}). */
export function sortedBuildingKeysFromRooms(rooms: Room[]): string[] {
  return sortedNavigationBuildingKeysFromRooms(rooms);
}
