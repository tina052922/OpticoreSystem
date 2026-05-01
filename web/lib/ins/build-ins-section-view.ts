import { INS_DAYS, type InsDay } from "@/components/ins/ins-layout/opticore-ins-constants";
import { isGecVacantScheduleEntry } from "@/lib/gec/gec-vacant";
import type { FacultyProfile, Room, ScheduleEntry, Section, Subject, User } from "@/types/db";
import { insInstructorDisplayName } from "@/lib/ins/ins-instructor-display";
import { scheduleEntryTimeLabel } from "./build-ins-faculty-view";

export type InsSectionCell = {
  time: string;
  startTime?: string;
  endTime?: string;
  course: string;
  instructor: string;
  room: string;
  vacantGec?: boolean;
  scheduleEntryId?: string;
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
  facultyProfileByUserId: Map<string, Pick<FacultyProfile, "fullName" | "aka">>;
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
      startTime: e.startTime,
      endTime: e.endTime,
      course: sub?.code ?? "—",
      instructor: insInstructorDisplayName(inst, args.facultyProfileByUserId.get(e.instructorId)),
      room: room?.code ?? "TBA",
      vacantGec: isGecVacantScheduleEntry(e, args.subjectById),
      scheduleEntryId: e.id,
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
