import { INS_DAYS, type InsDay } from "@/components/ins/ins-layout/opticore-ins-constants";
import { isGecVacantScheduleEntry } from "@/lib/gec/gec-vacant";
import { slotDurationHours } from "@/lib/scheduling/facultyPolicies";
import type { Room, ScheduleEntry, Section, Subject } from "@/types/db";

/** `vacantGec` is set when the live row is a CHED GEC/GEE slot still on the TBD placeholder instructor. */
export type InsFacultyCell = {
  time: string;
  /** Raw HH:MM from `ScheduleEntry` — enables multi-hour rowspan on INS grids. */
  startTime?: string;
  endTime?: string;
  course: string;
  yearSec: string;
  room: string;
  vacantGec?: boolean;
  /** Populated from `ScheduleEntry.id` for faculty “My Schedule” request-change UX. */
  scheduleEntryId?: string;
};

export type InsFacultySchedule = Record<InsDay, InsFacultyCell[]>;

export type InsFacultyTeachingMetrics = {
  /** Distinct subjects taught this term (preparations). */
  preparations: number;
  /** Sum of (lec + lab) units for each unique subject–section pairing. */
  totalUnits: number;
  /** Total scheduled hours per week (sum of slot lengths). */
  hoursPerWeek: number;
};

/** INS Form 5A — Summary of Courses footer metrics (schedule + Faculty Profile). */
export type InsFacultyFormSummary = InsFacultyTeachingMetrics & {
  administrativeDesignation: string | null;
  production: string | null;
  extension: string | null;
  research: string | null;
};

function fmtHm(t: string) {
  const [h, m] = t.split(":");
  return `${parseInt(h!, 10)}:${(m ?? "00").padStart(2, "0")}`;
}

/** Aligns with INS grid labels (e.g. 7:00-9:00). */
export function scheduleEntryTimeLabel(startTime: string, endTime: string) {
  return `${fmtHm(startTime)}-${fmtHm(endTime)}`;
}

function emptySchedule(): InsFacultySchedule {
  const o = {} as InsFacultySchedule;
  for (const d of INS_DAYS) o[d] = [];
  return o;
}

/** Map evaluator `day` (e.g. Monday) to INS day key. */
function toInsDay(day: string): InsDay | null {
  const d = INS_DAYS.find((x) => x === day);
  return d ?? null;
}

/**
 * Build INS Form 5A schedule grid + course list for one instructor from live `ScheduleEntry` rows.
 * Pass only that instructor’s rows for the term (may span multiple colleges); hours match My Schedule + policy.
 */
export function buildInsFacultyView(args: {
  entries: ScheduleEntry[];
  academicPeriodId: string;
  instructorId: string;
  sectionById: Map<string, Section>;
  subjectById: Map<string, Subject>;
  roomById: Map<string, Room>;
}): {
  schedule: InsFacultySchedule;
  courses: Array<{ students: number; code: string; title: string; degreeYrSec: string }>;
  teachingMetrics: InsFacultyTeachingMetrics;
} {
  const schedule = emptySchedule();
  const list = args.entries.filter(
    (e) => e.academicPeriodId === args.academicPeriodId && e.instructorId === args.instructorId,
  );

  /** Same duration math as {@link evaluateFacultyLoadsForCollege} / Evaluator. */
  let hoursPerWeek = 0;
  for (const e of list) {
    hoursPerWeek += slotDurationHours(e.startTime, e.endTime);
  }

  const distinctSubjects = new Set(list.map((e) => e.subjectId));
  const preparations = distinctSubjects.size;

  const seenPair = new Set<string>();
  let totalUnits = 0;
  for (const e of list) {
    const k = `${e.subjectId}:${e.sectionId}`;
    if (seenPair.has(k)) continue;
    seenPair.add(k);
    const sub = args.subjectById.get(e.subjectId);
    if (sub) totalUnits += sub.lecUnits + sub.labUnits;
  }

  for (const e of list) {
    const insDay = toInsDay(e.day);
    if (!insDay) continue;
    const sec = args.sectionById.get(e.sectionId);
    const sub = args.subjectById.get(e.subjectId);
    const room = args.roomById.get(e.roomId);
    schedule[insDay].push({
      time: scheduleEntryTimeLabel(e.startTime, e.endTime),
      startTime: e.startTime,
      endTime: e.endTime,
      course: sub?.code ?? "—",
      yearSec: sec?.name ?? "—",
      room: room?.code ?? "TBA",
      vacantGec: isGecVacantScheduleEntry(e, args.subjectById),
      scheduleEntryId: e.id,
    });
  }

  const courses: Array<{ students: number; code: string; title: string; degreeYrSec: string }> = [];
  const seenCoursePair = new Set<string>();
  for (const e of list) {
    const k = `${e.subjectId}:${e.sectionId}`;
    if (seenCoursePair.has(k)) continue;
    seenCoursePair.add(k);
    const sub = args.subjectById.get(e.subjectId);
    const sec = args.sectionById.get(e.sectionId);
    if (!sub || !sec) continue;
    courses.push({
      students: sec.studentCount,
      code: sub.code,
      title: sub.title,
      degreeYrSec: sec.name,
    });
  }

  const teachingMetrics: InsFacultyTeachingMetrics = {
    preparations,
    totalUnits,
    hoursPerWeek: Math.round(hoursPerWeek * 100) / 100,
  };

  return { schedule, courses, teachingMetrics };
}
