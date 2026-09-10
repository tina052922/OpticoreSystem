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
 * 2. BSIT legacy IT labs when no department rooms are configured for BSIT.
 * 3. Otherwise college (+ shared null-college) rooms that are not locked to another department.
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

  const code = (programCode ?? "").trim().toUpperCase();
  if (code === BSIT_PROGRAM_CODE) {
    return isBsitPlotEligibleRoom(room);
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

  // If this department has explicit rooms, prefer them (do not fall back to campus-wide noise).
  const deptId = (programId ?? "").trim();
  if (deptId && scoped.some((r) => (r.programId ?? "").trim() === deptId)) {
    return scoped.filter((r) => (r.programId ?? "").trim() === deptId);
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
