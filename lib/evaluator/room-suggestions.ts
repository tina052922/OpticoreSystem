/**
 * Room help for the Plot schedule window:
 *
 *   • `busyRoomIdsForMeetings` — rooms taken on ANY of the meetings being plotted (every day, its own
 *     start and duration), so the Building and Room lists can disable them.
 *   • `rankRoomSuggestions` — the free rooms that fit this subject best, with a plain reason:
 *       1. where this subject has met before (any term or section) — "Programming 1 → COTE 303";
 *       2. rooms of the section's own program (department);
 *       3. a laboratory for a lab meeting, a lecture room otherwise.
 *
 * Pure functions (no React, no fetch), so the ranking is unit-tested.
 */
import type { Room } from "@/types/db";
import { detectConflictsSparse, type SparseScheduleBlock } from "@/lib/scheduling/conflicts";
import type { ProgramMode } from "@/lib/scheduling/program-mode";

export type MeetingTime = { day: string; startTime: string; endTime: string };

export function busyRoomIdsForMeetings(args: {
  rooms: readonly Room[];
  meetings: readonly MeetingTime[];
  existingBlocks: readonly SparseScheduleBlock[];
  academicPeriodId: string;
  programMode: ProgramMode;
  /** The entry being edited (its own time never makes its room busy). */
  excludeId?: string;
}): Set<string> {
  const busy = new Set<string>();
  if (args.meetings.length === 0 || args.existingBlocks.length === 0) return busy;
  // Only rooms that appear in the existing blocks can be busy: check those, not every room.
  const usedRoomIds = new Set(args.existingBlocks.map((b) => b.roomId).filter((id): id is string => Boolean(id)));
  for (const room of args.rooms) {
    if (!usedRoomIds.has(room.id)) continue;
    for (const [i, m] of args.meetings.entries()) {
      const candidate: SparseScheduleBlock = {
        id: `${args.excludeId ?? "draft"}#${i}`,
        academicPeriodId: args.academicPeriodId,
        day: m.day,
        startTime: m.startTime,
        endTime: m.endTime,
        instructorId: null,
        sectionId: null,
        roomId: room.id,
        programMode: args.programMode,
      };
      if (detectConflictsSparse(candidate, args.existingBlocks as SparseScheduleBlock[], args.excludeId).some((h) => h.type === "room")) {
        busy.add(room.id);
        break;
      }
    }
  }
  return busy;
}

export type RoomSuggestion = {
  room: Room;
  score: number;
  /** Short reason shown under the suggestion, e.g. "Held CC-111 here 4×". */
  reason: string;
};

function isLabRoom(room: Room): boolean {
  return /lab/i.test(`${room.type ?? ""} ${room.code} ${room.displayName ?? ""}`);
}

export function ordinalFloor(floor: number | null | undefined): string | null {
  if (floor == null || !Number.isFinite(floor) || floor <= 0) return null;
  const n = Math.trunc(floor);
  const suffix = n % 100 >= 11 && n % 100 <= 13 ? "th" : (["th", "st", "nd", "rd"][n % 10] ?? "th");
  return `${n}${suffix} floor`;
}

export function rankRoomSuggestions(args: {
  rooms: readonly Room[];
  /** roomId → meetings of this subject held there before (from `/api/catalog/room-usage`). */
  usage: ReadonlyMap<string, number>;
  subjectCode: string;
  /** The section's program (department), for "rooms of this department". */
  programId?: string | null;
  /** True for a laboratory meeting. */
  wantLab: boolean;
  /** Rooms taken at the chosen times: never suggested. */
  busy: ReadonlySet<string>;
  limit?: number;
}): RoomSuggestion[] {
  const out: RoomSuggestion[] = [];
  for (const room of args.rooms) {
    if (args.busy.has(room.id)) continue;
    const used = args.usage.get(room.id) ?? 0;
    const ownProgram = Boolean(args.programId && room.programId === args.programId);
    const lab = isLabRoom(room);
    const typeFits = args.wantLab ? lab : !lab;
    let score = 0;
    if (used > 0) score += 100 + Math.min(used, 20) * 5;
    if (ownProgram) score += 30;
    if (typeFits) score += args.wantLab ? 25 : 10;
    else if (args.wantLab) score -= 20; // a lecture room is a poor home for a lab
    if (score <= 0) continue;
    const reason =
      used > 0
        ? `Held ${args.subjectCode} here ${used}×`
        : ownProgram && typeFits
          ? args.wantLab
            ? "Your department's lab"
            : "Your department's room"
          : ownProgram
            ? "Your department's room"
            : args.wantLab
              ? "Laboratory"
              : "Lecture room";
    out.push({ room, score, reason });
  }
  out.sort((a, b) => b.score - a.score || a.room.code.localeCompare(b.room.code));
  return out.slice(0, args.limit ?? 3);
}

/** Lines that say the same thing once: trims, drops trailing periods, ignores case. */
export function dedupeMessages(lines: readonly (string | null | undefined)[]): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const raw of lines) {
    const line = (raw ?? "").trim();
    if (!line) continue;
    const key = line.replace(/[.\s]+$/, "").toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(line);
  }
  return out;
}
