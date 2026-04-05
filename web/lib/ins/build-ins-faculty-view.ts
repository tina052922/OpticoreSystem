import { INS_DAYS, type InsDay } from "@/components/ins/ins-layout/opticore-ins-constants";
import type { Room, ScheduleEntry, Section, Subject } from "@/types/db";

export type InsFacultyCell = { time: string; course: string; yearSec: string; room: string };

export type InsFacultySchedule = Record<InsDay, InsFacultyCell[]>;

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
 */
export function buildInsFacultyView(args: {
  entries: ScheduleEntry[];
  academicPeriodId: string;
  instructorId: string;
  sectionById: Map<string, Section>;
  subjectById: Map<string, Subject>;
  roomById: Map<string, Room>;
}): { schedule: InsFacultySchedule; courses: Array<{ students: number; code: string; title: string; degreeYrSec: string }> } {
  const schedule = emptySchedule();
  const list = args.entries.filter(
    (e) => e.academicPeriodId === args.academicPeriodId && e.instructorId === args.instructorId,
  );

  for (const e of list) {
    const insDay = toInsDay(e.day);
    if (!insDay) continue;
    const sec = args.sectionById.get(e.sectionId);
    const sub = args.subjectById.get(e.subjectId);
    const room = args.roomById.get(e.roomId);
    schedule[insDay].push({
      time: scheduleEntryTimeLabel(e.startTime, e.endTime),
      course: sub?.code ?? "—",
      yearSec: sec?.name ?? "—",
      room: room?.code ?? "TBA",
    });
  }

  const courses: Array<{ students: number; code: string; title: string; degreeYrSec: string }> = [];
  const seenPair = new Set<string>();
  for (const e of list) {
    const k = `${e.subjectId}:${e.sectionId}`;
    if (seenPair.has(k)) continue;
    seenPair.add(k);
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

  return { schedule, courses };
}
