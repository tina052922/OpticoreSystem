import { INS_DAYS, type InsDay } from "@/components/ins/ins-layout/opticore-ins-constants";
import { isGecVacantScheduleEntry } from "@/lib/gec/gec-vacant";
import type { Room, ScheduleEntry, Section, Subject, User } from "@/types/db";
import { scheduleEntryTimeLabel } from "./build-ins-faculty-view";

export type InsSectionCell = {
  time: string;
  course: string;
  instructor: string;
  room: string;
  vacantGec?: boolean;
};

export type InsSectionSchedule = Record<InsDay, InsSectionCell[]>;

export function emptyInsSectionSchedule(): InsSectionSchedule {
  const o = {} as InsSectionSchedule;
  for (const d of INS_DAYS) o[d] = [];
  return o;
}

function toInsDay(day: string): InsDay | null {
  const d = INS_DAYS.find((x) => x === day);
  return d ?? null;
}

/** INS Form 5B grid + course list for one section from live `ScheduleEntry` rows. */
export function buildInsSectionView(args: {
  entries: ScheduleEntry[];
  academicPeriodId: string;
  sectionId: string;
  sectionById: Map<string, Section>;
  subjectById: Map<string, Subject>;
  roomById: Map<string, Room>;
  userById: Map<string, User>;
}): {
  schedule: InsSectionSchedule;
  courses: Array<{ students: number; code: string; title: string; degreeYrSec: string }>;
} {
  const schedule = emptyInsSectionSchedule();
  const list = args.entries.filter(
    (e) => e.academicPeriodId === args.academicPeriodId && e.sectionId === args.sectionId,
  );

  for (const e of list) {
    const insDay = toInsDay(e.day);
    if (!insDay) continue;
    const sub = args.subjectById.get(e.subjectId);
    const room = args.roomById.get(e.roomId);
    const inst = args.userById.get(e.instructorId);
    schedule[insDay].push({
      time: scheduleEntryTimeLabel(e.startTime, e.endTime),
      course: sub?.code ?? "—",
      instructor: inst?.name ?? "—",
      room: room?.code ?? "TBA",
      vacantGec: isGecVacantScheduleEntry(e, args.subjectById),
    });
  }

  const courses: Array<{ students: number; code: string; title: string; degreeYrSec: string }> = [];
  const seenSubject = new Set<string>();
  const sec = args.sectionById.get(args.sectionId);
  for (const e of list) {
    if (seenSubject.has(e.subjectId)) continue;
    seenSubject.add(e.subjectId);
    const sub = args.subjectById.get(e.subjectId);
    if (!sub || !sec) continue;
    courses.push({
      students: sec.studentCount,
      code: sub.code,
      title: sub.title,
      degreeYrSec: sec.name,
    });
  }

  return { schedule, courses };
}
