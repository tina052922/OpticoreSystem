import { BSIT_PROGRAM_CODE, isBsitPlotEligibleRoom } from "@/lib/chairman/bsit-prospectus";
import type { Room } from "@/types/db";

export type PlotRoomScope = Pick<
  Room,
  "id" | "code" | "displayName" | "building" | "collegeId" | "programId" | "gecUsable"
>;

/**
 * Rooms available in the chairman / program plotter dropdown.
 *
 * Priority:
 * 1. Rooms assigned to this department (`programId`) — only that department may use them.
 * 2. College (+ shared null-college) rooms that are not locked to another department — this is what
 *    College Admin / DOI manage in Buildings & Rooms, so a new COTE Building room shows up here.
 * 3. BSIT legacy IT labs, only as a fallback when the college has no rooms configured at all.
 *
 * The BSIT allowlist used to be applied as a *filter* rather than a fallback, which hid every room
 * added through Buildings & Rooms from the BSIT plotter.
 */
export function isRoomEligibleForProgramPlot(
  room: PlotRoomScope,
  programCode: string | null | undefined,
  chairmanCollegeId: string | null | undefined,
  programId?: string | null,
): boolean {
  const deptId = (programId ?? "").trim();
  const roomDept = (room.programId ?? "").trim();

  // Department-owned rooms are exclusive to that department.
  if (roomDept) {
    return Boolean(deptId) && roomDept === deptId;
  }

  if (!chairmanCollegeId) return true;
  return !room.collegeId || room.collegeId === chairmanCollegeId;
}

export function filterRoomsForProgramPlot(
  rooms: Room[],
  programCode: string | null | undefined,
  chairmanCollegeId: string | null | undefined,
  programId?: string | null,
): Room[] {
  const scoped = rooms.filter((r) =>
    isRoomEligibleForProgramPlot(r, programCode, chairmanCollegeId, programId),
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
export function filterRoomsForGecPlot(rooms: Room[], collegeId: string | null | undefined): Room[] {
  if (!collegeId) return [];
  const inCollege = rooms.filter((r) => !r.collegeId || r.collegeId === collegeId);
  const gecMarked = inCollege.filter((r) => r.gecUsable === true);
  return gecMarked.length > 0 ? gecMarked : inCollege;
}
