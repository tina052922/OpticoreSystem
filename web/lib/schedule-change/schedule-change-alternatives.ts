import type { Room, ScheduleEntry } from "@/types/db";
import { WEEKDAYS, TIME_SLOT_OPTIONS } from "@/lib/scheduling/constants";
import { checkConflictForProposedMove } from "@/lib/schedule-change/conflict-check";
import { suggestMitigationForScheduleChange } from "@/lib/schedule-change/suggested-mitigation";
import { slotDurationHours } from "@/lib/scheduling/time";

function addMinutesToHHMM(start: string, deltaMinutes: number): string {
  const raw = start.trim().slice(0, 5);
  const [h, m] = raw.split(":").map((x) => parseInt(x, 10));
  if (Number.isNaN(h) || Number.isNaN(m)) return start;
  let t = h * 60 + m + deltaMinutes;
  t = ((t % (24 * 60)) + 24 * 60) % (24 * 60);
  return `${String(Math.floor(t / 60)).padStart(2, "0")}:${String(t % 60).padStart(2, "0")}`;
}

export type ScheduleChangeAlternative = {
  /** What this suggestion changes relative to the instructor’s request. */
  kind: "room" | "day" | "time";
  label: string;
  day: string;
  startTime: string;
  endTime: string;
  roomId?: string;
  roomCode?: string;
};

/**
 * Non–auto-applied ideas for College Admin (time / day / room only). Caller never applies these without human choice.
 */
export function buildScheduleChangeAlternatives(
  entry: ScheduleEntry,
  requestedDay: string,
  requestedStart: string,
  requestedEnd: string,
  allCampus: ScheduleEntry[],
  rooms: Room[],
  maxTotal = 12,
): ScheduleChangeAlternative[] {
  const out: ScheduleChangeAlternative[] = [];
  const push = (a: ScheduleChangeAlternative) => {
    if (out.length >= maxTotal) return;
    if (
      !out.some(
        (x) =>
          x.kind === a.kind &&
          x.day === a.day &&
          x.startTime === a.startTime &&
          x.endTime === a.endTime &&
          x.roomId === a.roomId,
      )
    ) {
      out.push(a);
    }
  };

  const roomMit = suggestMitigationForScheduleChange(
    entry,
    requestedDay,
    requestedStart,
    requestedEnd,
    allCampus,
    rooms,
  );
  if (roomMit && roomMit.roomId) {
    const { severity } = checkConflictForProposedMove(
      entry,
      requestedDay,
      requestedStart,
      requestedEnd,
      allCampus,
      roomMit.roomId,
    );
    if (severity === "none") {
      push({
        kind: "room",
        label: `Room: use ${roomMit.roomCode ?? "another room"} (same day/time as requested).`,
        day: requestedDay,
        startTime: requestedStart,
        endTime: requestedEnd,
        roomId: roomMit.roomId,
        roomCode: roomMit.roomCode,
      });
    }
  }

  const durationH = Math.max(0.5, slotDurationHours(requestedStart, requestedEnd));

  for (const d of WEEKDAYS) {
    if (d === requestedDay) continue;
    const { severity } = checkConflictForProposedMove(entry, d, requestedStart, requestedEnd, allCampus);
    if (severity === "none") {
      push({
        kind: "day",
        label: `Day: move to ${d} (keep same start/end as requested: ${requestedStart}–${requestedEnd}).`,
        day: d,
        startTime: requestedStart,
        endTime: requestedEnd,
      });
    }
    if (out.length >= maxTotal) break;
  }

  const durationMinutes = Math.max(30, Math.round(durationH * 60));

  for (const slot of TIME_SLOT_OPTIONS) {
    if (out.length >= maxTotal) break;
    const candStart = slot.startTime;
    const candEnd = addMinutesToHHMM(candStart, durationMinutes);
    if (candStart === requestedStart.slice(0, 5) && candEnd === requestedEnd.slice(0, 5)) continue;
    const { severity } = checkConflictForProposedMove(entry, requestedDay, candStart, candEnd, allCampus);
    if (severity === "none") {
      push({
        kind: "time",
        label: `Time: same day (${requestedDay}), try ${candStart}–${candEnd} (same duration as requested).`,
        day: requestedDay,
        startTime: candStart,
        endTime: candEnd,
      });
    }
  }

  return out;
}
