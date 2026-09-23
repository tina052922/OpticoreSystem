/**
 * Campus room count for the Campus Intelligence dashboard (server components).
 *
 * Mirror of `opticore-backend/src/lib/campus-room-count.ts` so both paths report the same number.
 *
 * The tile must read the same number that Buildings & Rooms shows, and the same number for every
 * role — a room is a campus resource, not a departmental one. It used to be counted per scope with
 * `collegeId = X OR collegeId IS NULL`, which gave a Chairman a handful of rooms and a GEC Chairman
 * a hundred-odd, none of them matching the management page.
 *
 * Counted are the rooms that belong to a building in the `Building` table, matched by
 * `Room.buildingId` or, for rooms seeded before that column, by the building's name. Rooms left over
 * from a deleted building are excluded, exactly as they are in Buildings & Rooms.
 *
 * Fallback: if the `Building` table is missing or empty (migration 010 not run), every `Room` row is
 * counted, which is what the page shows in that state.
 */

type RoomRow = { buildingId?: string | null; building?: string | null };
type BuildingRow = { id?: string | null; name?: string | null };

function norm(v: unknown): string {
  return String(v ?? "").replace(/\s+/g, " ").trim().toLowerCase();
}

/** Rooms that belong to a known building; `rooms.length` when there are no buildings to match. */
export function countRoomsInBuildingCatalog(
  rooms: readonly RoomRow[],
  buildings: readonly BuildingRow[],
): number {
  const named = buildings.filter((b) => norm(b.name));
  if (named.length === 0) return rooms.length;

  const ids = new Set(named.map((b) => String(b.id ?? "")).filter(Boolean));
  const names = new Set(named.map((b) => norm(b.name)));

  return rooms.filter((r) => {
    const buildingId = String(r.buildingId ?? "").trim();
    if (buildingId) return ids.has(buildingId);
    const text = norm(r.building);
    return Boolean(text) && names.has(text);
  }).length;
}

/**
 * Reads both tables and returns the campus-wide count. `selectRooms` / `selectBuildings` are passed
 * in so the caller owns the Supabase client (service role on the server, RLS client on the web).
 */
export async function campusRoomCount(
  selectRooms: () => Promise<{ data: RoomRow[] | null; error: unknown }>,
  selectBuildings: () => Promise<{ data: BuildingRow[] | null; error: unknown }>,
): Promise<number> {
  const [roomsRes, buildingsRes] = await Promise.all([selectRooms(), selectBuildings()]);
  const rooms = roomsRes.data ?? [];
  // A missing Building table is not an error here: every room counts, as on the page.
  const buildings = buildingsRes.error ? [] : buildingsRes.data ?? [];
  return countRoomsInBuildingCatalog(rooms, buildings);
}
