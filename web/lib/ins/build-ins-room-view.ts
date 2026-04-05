import { INS_DAYS, type InsDay } from "@/components/ins/ins-layout/opticore-ins-constants";
import type { Room, ScheduleEntry, Section, Subject } from "@/types/db";
import { scheduleEntryTimeLabel } from "./build-ins-faculty-view";

export type InsRoomCell = { time: string; course: string; yearSec: string; room: string };

export type InsRoomSchedule = Record<InsDay, InsRoomCell[]>;

export function emptyInsRoomSchedule(): InsRoomSchedule {
  const o = {} as InsRoomSchedule;
  for (const d of INS_DAYS) o[d] = [];
  return o;
}

function toInsDay(day: string): InsDay | null {
  const d = INS_DAYS.find((x) => x === day);
  return d ?? null;
}

/** INS Form 5C grid for one room from live `ScheduleEntry` rows. */
export function buildInsRoomView(args: {
  entries: ScheduleEntry[];
  academicPeriodId: string;
  roomId: string;
  sectionById: Map<string, Section>;
  subjectById: Map<string, Subject>;
  roomById: Map<string, Room>;
}): { schedule: InsRoomSchedule; roomLabel: string } {
  const schedule = emptyInsRoomSchedule();
  const list = args.entries.filter(
    (e) => e.academicPeriodId === args.academicPeriodId && e.roomId === args.roomId,
  );
  const room = args.roomById.get(args.roomId);
  const roomLabel = room?.code ?? "Room";

  for (const e of list) {
    const insDay = toInsDay(e.day);
    if (!insDay) continue;
    const sub = args.subjectById.get(e.subjectId);
    const sec = args.sectionById.get(e.sectionId);
    schedule[insDay].push({
      time: scheduleEntryTimeLabel(e.startTime, e.endTime),
      course: sub?.code ?? "—",
      yearSec: sec?.name ?? "—",
      room: room?.code ?? "TBA",
    });
  }

  return { schedule, roomLabel };
}
