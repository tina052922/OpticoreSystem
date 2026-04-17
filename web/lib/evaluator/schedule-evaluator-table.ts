import { detectConflictsForEntry } from "@/lib/scheduling/conflicts";
import type { ScheduleBlock } from "@/lib/scheduling/types";
import type { FacultyProfile, Program, Room, ScheduleEntry, Section, Subject, User } from "@/types/db";
import { formatUserInstructorLabel } from "@/lib/evaluator/instructor-employee-id";

/** Match Central Hub / Figma column formatting. */
export function formatTimeRange(start: string, end: string): string {
  const fmt = (t: string) => {
    const [h, m] = t.split(":").map((x) => parseInt(x, 10));
    return `${h}:${String(m ?? 0).padStart(2, "0")}`;
  };
  return `${fmt(start)}-${fmt(end)}`;
}

export function dayAbbrev(day: string): string {
  const d = day.trim();
  if (d === "Thursday") return "Th";
  if (d.length <= 3) return d.charAt(0).toUpperCase();
  return d.slice(0, 3);
}

function toBlock(e: ScheduleEntry): ScheduleBlock {
  return {
    id: e.id,
    academicPeriodId: e.academicPeriodId,
    subjectId: e.subjectId,
    instructorId: e.instructorId,
    sectionId: e.sectionId,
    roomId: e.roomId,
    day: e.day,
    startTime: e.startTime,
    endTime: e.endTime,
  };
}

export type ScheduleEvaluatorTableRow = {
  id: string;
  college: string;
  major: string;
  section: string;
  students: number | null;
  subjectCode: string;
  instructor: string;
  room: string;
  time: string;
  day: string;
  facultyConflict: string;
  sectionConflict: string;
  /** Same overlap logic as faculty/section: two entries in the same room at overlapping times. */
  roomConflict: string;
};

/**
 * Builds rows for the orange Evaluator schedule grid (Chairman + Central Hub).
 * When scopeCollegeId is null, all colleges are included and `college` is filled per row.
 */
export function buildScheduleEvaluatorTableRows(args: {
  entries: ScheduleEntry[];
  academicPeriodId: string;
  scopeCollegeId: string | null;
  programId: string;
  sectionById: Map<string, Section>;
  programById: Map<string, Program>;
  subjectById: Map<string, Subject>;
  roomById: Map<string, Room>;
  userById: Map<string, User>;
  /** Optional: Faculty Profile rows so the grid shows full name (not raw `User.name` only). */
  facultyProfileByUserId?: Map<string, Pick<FacultyProfile, "fullName">>;
  collegeNameById: Map<string, string>;
}): ScheduleEvaluatorTableRow[] {
  const universe = args.entries.map(toBlock);
  const {
    entries,
    academicPeriodId,
    scopeCollegeId,
    programId,
    sectionById,
    programById,
    subjectById,
    roomById,
    userById,
    facultyProfileByUserId,
    collegeNameById,
  } = args;

  const list = entries.filter((e) => {
    if (e.academicPeriodId !== academicPeriodId) return false;
    const sec = sectionById.get(e.sectionId);
    if (!sec) return false;
    const pr = programById.get(sec.programId);
    if (!pr) return false;
    if (scopeCollegeId && pr.collegeId !== scopeCollegeId) return false;
    if (programId && sec.programId !== programId) return false;
    return true;
  });

  return list.map((e) => {
    const sec = sectionById.get(e.sectionId)!;
    const sub = subjectById.get(e.subjectId);
    const room = roomById.get(e.roomId);
    const inst = userById.get(e.instructorId);
    const pr = programById.get(sec.programId);
    const hits = detectConflictsForEntry(toBlock(e), universe);
    const fac = hits.some((h) => h.type === "faculty");
    const secConflict = hits.some((h) => h.type === "section");
    const roomConflict = hits.some((h) => h.type === "room");
    return {
      id: e.id,
      college: pr ? collegeNameById.get(pr.collegeId) ?? pr.collegeId : "",
      major: pr?.code ?? "",
      section: sec.name,
      students: sec.studentCount,
      subjectCode: sub?.code ?? "—",
      instructor: formatUserInstructorLabel(inst, facultyProfileByUserId?.get(e.instructorId)),
      room: room?.code ?? "TBA",
      time: formatTimeRange(e.startTime, e.endTime),
      day: dayAbbrev(e.day),
      facultyConflict: fac ? "Yes" : "",
      sectionConflict: secConflict ? "Yes" : "",
      roomConflict: roomConflict ? "Yes" : "",
    };
  });
}
