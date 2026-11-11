import type { Building, Room } from "@/types/db";
import { dedupeLegacyItLabsForCampusNavigation } from "@/lib/campus/campus-navigation-room-dedupe";
import { buildingNameForRoom } from "@/lib/evaluator/building-options";
import { insRoomLabel } from "@/lib/ins/ins-room-label";

/**
 * Rooms offered when plotting a class — every room in Buildings & Rooms, for every role.
 *
 * Rooms used to be limited by college and department (a BSIT chairman saw only the COTE rooms, a
 * room tagged to one program was hidden from the rest). Rooms that existed in Buildings & Rooms
 * then went missing from the Subject Scheduler, so the scope was dropped: any room can be picked,
 * and the room-conflict check is what stops two classes landing in the same room at once.
 *
 * Legacy duplicate rows of the same physical room are still hidden, and the list is ordered by
 * building, then code.
 */
export function roomsForPlotting(rooms: readonly Room[]): Room[] {
  return [...dedupeLegacyItLabsForCampusNavigation([...rooms])].sort((a, b) => {
    const ba = (a.building ?? "").localeCompare(b.building ?? "");
    if (ba !== 0) return ba;
    return a.code.localeCompare(b.code);
  });
}

export type PlotRoomSearchHit = { room: Room; buildingName: string };

/** "04" → "4", "0" stays "0". */
const unpad = (t: string) => t.replace(/^0+(?=\d)/, "");

function norm(v: string | null | undefined): string {
  return (v ?? "").replace(/\s+/g, " ").trim().toLowerCase();
}

/**
 * Rooms matching a typed search, across all buildings. Every word must start a word of the room's
 * name, code or building ("lab 4", "cote 303", "agri"). Only rooms that sit in a building the
 * Building select knows are returned, so picking a hit can fill both selects.
 */
export function searchPlotRooms(
  rooms: readonly Room[],
  buildings: readonly Building[] | null | undefined,
  query: string,
  limit = 12,
): PlotRoomSearchHit[] {
  const words = norm(query).split(/[\s\-–—:|/]+/).filter(Boolean);
  if (words.length === 0) return [];
  const hits: PlotRoomSearchHit[] = [];
  for (const room of rooms) {
    const buildingName = buildingNameForRoom(room, buildings);
    if (!buildingName) continue;
    // Each typed word must START a word of the room's name, code or building, so "it lab 4" finds
    // "IT Lab 04" but not "Digital … COTE 204". Leading zeros are ignored ("lab 4" = "Lab 04").
    const tokens = norm([insRoomLabel(room, ""), room.code, room.displayName, buildingName].join(" "))
      .split(/[\s\-–—:|/]+/)
      .filter(Boolean)
      .map(unpad);
    if (words.every((w) => tokens.some((t) => t.startsWith(unpad(w))))) {
      hits.push({ room, buildingName });
      if (hits.length >= limit) break;
    }
  }
  return hits;
}
