import type { InsDay } from "@/components/ins/ins-layout/opticore-ins-constants";
import { INS_DAYS } from "@/components/ins/ins-layout/opticore-ins-constants";
import { buildInsFacultyView } from "@/lib/ins/build-ins-faculty-view";
import { emptyInsSectionSchedule, type InsSectionSchedule } from "@/lib/ins/build-ins-section-view";
import { scheduleEntryTimeLabel } from "@/lib/ins/build-ins-faculty-view";
import type { ScheduleRowView } from "@/lib/server/dashboard-data";
import type { ScheduleEntry, Section, Subject, Room } from "@/types/db";

function toInsDay(day: string): InsDay | null {
  const d = INS_DAYS.find((x) => x === day);
  return d ?? null;
}

/** Build INS 5B grid + course list from hydrated student schedule rows (one section). */
export function buildPortalStudentIns5B(rows: ScheduleRowView[]): {
  schedule: InsSectionSchedule;
  courses: Array<{ students: number; code: string; title: string; degreeYrSec: string }>;
} {
  const schedule = emptyInsSectionSchedule();
  for (const r of rows) {
    const insDay = toInsDay(r.entry.day);
    if (!insDay) continue;
    schedule[insDay].push({
      time: scheduleEntryTimeLabel(r.entry.startTime, r.entry.endTime),
      course: r.subject?.code ?? "—",
      instructor: r.instructor?.name ?? "—",
      room: r.room?.code ?? "TBA",
    });
  }

  const courses: Array<{ students: number; code: string; title: string; degreeYrSec: string }> = [];
  const seen = new Set<string>();
  const section = rows[0]?.section;
  for (const r of rows) {
    if (!r.subject || seen.has(r.entry.subjectId)) continue;
    seen.add(r.entry.subjectId);
    courses.push({
      students: section?.studentCount ?? 0,
      code: r.subject.code,
      title: r.subject.title,
      degreeYrSec: section?.name ?? "—",
    });
  }

  return { schedule, courses };
}

/** Build INS 5A grid + course list from hydrated instructor schedule rows. */
export function buildPortalFacultyIns5A(
  rows: ScheduleRowView[],
  academicPeriodId: string,
  instructorId: string,
): {
  schedule: ReturnType<typeof buildInsFacultyView>["schedule"];
  courses: ReturnType<typeof buildInsFacultyView>["courses"];
} {
  if (rows.length === 0) {
    const empty: ReturnType<typeof buildInsFacultyView>["schedule"] = {
      Monday: [],
      Tuesday: [],
      Wednesday: [],
      Thursday: [],
      Friday: [],
      Saturday: [],
      Sunday: [],
    };
    return { schedule: empty, courses: [] };
  }

  const entries: ScheduleEntry[] = rows.map((r) => r.entry);
  const sectionById = new Map<string, Section>();
  const subjectById = new Map<string, Subject>();
  const roomById = new Map<string, Room>();

  for (const r of rows) {
    if (r.section) sectionById.set(r.section.id, r.section);
    if (r.subject) subjectById.set(r.subject.id, r.subject);
    if (r.room) roomById.set(r.room.id, r.room);
  }

  return buildInsFacultyView({
    entries,
    academicPeriodId,
    instructorId,
    sectionById,
    subjectById,
    roomById,
  });
}
