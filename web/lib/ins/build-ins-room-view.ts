import { INS_DAYS, type InsDay } from "@/components/ins/ins-layout/opticore-ins-constants";
import { isGecVacantScheduleEntry } from "@/lib/gec/gec-vacant";
import type { FacultyProfile, Room, ScheduleEntry, Section, Subject, User } from "@/types/db";
import { insInstructorDisplayName } from "@/lib/ins/ins-instructor-display";
import { scheduleEntryTimeLabel } from "./build-ins-faculty-view";

/** Room grid: includes instructor line (INS naming rules: AKA or full name). */
export type InsRoomCell = {
  time: string;
  startTime?: string;
  endTime?: string;
  course: string;
  instructor: string;
  yearSec: string;
  room: string;
  vacantGec?: boolean;
};

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
  userById: Map<string, User>;
  facultyProfileByUserId: Map<string, Pick<FacultyProfile, "fullName" | "aka">>;
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
    const instUser = args.userById.get(e.instructorId);
    schedule[insDay].push({
      time: scheduleEntryTimeLabel(e.startTime, e.endTime),
      startTime: e.startTime,
      endTime: e.endTime,
      course: sub?.code ?? "—",
      instructor: insInstructorDisplayName(instUser, args.facultyProfileByUserId.get(e.instructorId)),
      yearSec: sec?.name ?? "—",
      room: room?.code ?? "TBA",
      vacantGec: isGecVacantScheduleEntry(e, args.subjectById),
    });
  }

  return { schedule, roomLabel };
}
