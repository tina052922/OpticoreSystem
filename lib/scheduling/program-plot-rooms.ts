import { BSIT_PROGRAM_CODE, isBsitPlotEligibleRoom } from "@/lib/chairman/bsit-prospectus";
import type { Room } from "@/types/db";

/**
 * Rooms available in the chairman / program plotter dropdown.
 * BSIT: official IT labs only. Other programs: home college (+ shared null-college) rooms.
 */
export function isRoomEligibleForProgramPlot(
  room: Pick<Room, "id" | "code" | "displayName" | "building" | "collegeId">,
  programCode: string | null | undefined,
  chairmanCollegeId: string | null | undefined,
): boolean {
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
): Room[] {
  return rooms.filter((r) => isRoomEligibleForProgramPlot(r, programCode, chairmanCollegeId));
}
