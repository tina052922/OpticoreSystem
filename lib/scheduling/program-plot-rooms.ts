import { BSIT_PROGRAM_CODE, isBsitPlotEligibleRoom } from "@/lib/chairman/bsit-prospectus";
import type { Building, Room } from "@/types/db";

export type PlotRoomScope = Pick<
  Room,
  "id" | "code" | "displayName" | "building" | "collegeId" | "programId" | "gecUsable"
> & { buildingId?: string | null };

/** Only what is needed to tell which college a building belongs to. */
export type PlotBuildingScope = Pick<Building, "id" | "name" | "collegeId">;

function norm(v: string | null | undefined): string {
  return (v ?? "").replace(/\s+/g, " ").trim().toLowerCase();
}

/**
 * The college a room sits in.
 *
 * The building decides it. A room in the Agriculture Building belongs to CAFE even when its own
 * `collegeId` is null — and most rooms have a null `collegeId`, so reading only that field let a
 * COTE chairman plot into CAFE's rooms. `Room.collegeId` is the fallback for rooms in no building.
 */
export function roomCollegeId(
  room: PlotRoomScope,
  buildings: readonly PlotBuildingScope[] = [],
): string | null {
  const byId = (room.buildingId ?? "").trim();
  if (byId) {
    const hit = buildings.find((b) => b.id === byId);
    if (hit) return hit.collegeId ?? null;
  }
  const byName = norm(room.building);
  if (byName) {
    const hit = buildings.find((b) => norm(b.name) === byName);
    if (hit) return hit.collegeId ?? null;
  }
  return room.collegeId ?? null;
}

/**
 * Rooms available in the chairman / program plotter dropdown.
 *
 * Priority:
 * 1. Rooms assigned to this department (`programId`) — only that department may use them.
 * 2. Rooms in this chairman's college, plus rooms assigned to no college at all (campus-shared) —
 *    this is what College Admin / DOI manage in Buildings & Rooms.
 * 3. BSIT legacy IT labs, only as a fallback when the college has no rooms configured at all.
 *
 * A room in ANOTHER college is never offered. That is judged by the room's building (see
 * {@link roomCollegeId}), because most rooms carry no `collegeId` of their own.
 */
export function isRoomEligibleForProgramPlot(
  room: PlotRoomScope,
  programCode: string | null | undefined,
  chairmanCollegeId: string | null | undefined,
  programId?: string | null,
  buildings: readonly PlotBuildingScope[] = [],
): boolean {
  const deptId = (programId ?? "").trim();
  const roomDept = (room.programId ?? "").trim();

  // Department-owned rooms are exclusive to that department.
  if (roomDept) {
    return Boolean(deptId) && roomDept === deptId;
  }

  if (!chairmanCollegeId) return true;
  const college = roomCollegeId(room, buildings);
  // No college on the room or its building: campus-shared, so anyone may plot it.
  return !college || college === chairmanCollegeId;
}

export function filterRoomsForProgramPlot(
  rooms: Room[],
  programCode: string | null | undefined,
  chairmanCollegeId: string | null | undefined,
  programId?: string | null,
  buildings: readonly PlotBuildingScope[] = [],
): Room[] {
  const scoped = rooms.filter((r) =>
    isRoomEligibleForProgramPlot(r, programCode, chairmanCollegeId, programId, buildings),
  );

  /**
   * Owning a room does not cost a department the shared ones.
   *
   * This used to return ONLY the department's own rooms as soon as it had any. With two rooms tagged
   * `prog-bsit`, the BSIT chairman lost every general classroom — so picking "COTE Building" in the
   * plot modal listed no rooms at all. Rooms belonging to another department are still excluded, by
   * `isRoomEligibleForProgramPlot`.
   */
  // Nothing configured for this college yet: keep the BSIT labs usable rather than showing nothing.
  const code = (programCode ?? "").trim().toUpperCase();
  if (scoped.length === 0 && code === BSIT_PROGRAM_CODE) {
    return rooms.filter((r) => !(r.programId ?? "").trim() && isBsitPlotEligibleRoom(r));
  }

  return scoped;
}

/**
 * GEC plotting: prefer rooms marked `gecUsable` within the college.
 * Falls back to college (+ shared) rooms when none are flagged yet so plotting stays usable
 * until admins configure GEC buildings.
 */
export function filterRoomsForGecPlot(
  rooms: Room[],
  collegeId: string | null | undefined,
  buildings: readonly PlotBuildingScope[] = [],
): Room[] {
  if (!collegeId) return [];
  const inCollege = rooms.filter((r) => {
    const college = roomCollegeId(r, buildings);
    return !college || college === collegeId;
  });
  const gecMarked = inCollege.filter((r) => r.gecUsable === true);
  return gecMarked.length > 0 ? gecMarked : inCollege;
}
