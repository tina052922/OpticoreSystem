import { createSupabaseServerClient } from "@/lib/supabase/server";
import { Q } from "@/lib/supabase/catalog-columns";
import type { AcademicPeriod, Program, Room, ScheduleEntry, Section, StudentProfile, Subject, User } from "@/types/db";

const USER_SCHEDULE_LOOKUP = "id,name,email,role,collegeId,employeeId";

export type ScheduleRowView = {
  entry: ScheduleEntry;
  subject: Subject | null;
  room: Room | null;
  instructor: User | null;
  section?: Section | null;
};

export async function getCurrentAcademicPeriod(): Promise<AcademicPeriod | null> {
  const supabase = await createSupabaseServerClient();
  if (!supabase) return null;
  const { data: cur } = await supabase
    .from("AcademicPeriod")
    .select(Q.academicPeriod)
    .eq("isCurrent", true)
    .maybeSingle();
  if (cur) return cur as AcademicPeriod;
  const { data: first } = await supabase
    .from("AcademicPeriod")
    .select(Q.academicPeriod)
    .order("startDate", { ascending: false })
    .limit(1)
    .maybeSingle();
  return (first as AcademicPeriod) ?? null;
}

export async function getStudentProfileForUser(userId: string): Promise<StudentProfile | null> {
  const supabase = await createSupabaseServerClient();
  if (!supabase) return null;
  const { data } = await supabase.from("StudentProfile").select(Q.studentProfile).eq("userId", userId).maybeSingle();
  return (data as StudentProfile) ?? null;
}

export async function getStudentScheduleRows(
  studentUserId: string,
  academicPeriodId: string,
): Promise<{ rows: ScheduleRowView[]; section: Section | null; program: Program | null }> {
  const supabase = await createSupabaseServerClient();
  if (!supabase) return { rows: [], section: null, program: null };

  const profile = await getStudentProfileForUser(studentUserId);
  if (!profile) return { rows: [], section: null, program: null };

  const { data: sec } = await supabase.from("Section").select(Q.section).eq("id", profile.sectionId).maybeSingle();
  const section = (sec as Section) ?? null;

  const { data: prog } = section
    ? await supabase.from("Program").select(Q.program).eq("id", section.programId).maybeSingle()
    : { data: null };
  const program = (prog as Program) ?? null;

  const { data: entries, error } = await supabase
    .from("ScheduleEntry")
    .select(Q.scheduleEntry)
    .eq("academicPeriodId", academicPeriodId)
    .eq("sectionId", profile.sectionId)
    .order("day", { ascending: true });

  if (error || !entries?.length) return { rows: [], section, program };

  const subjectIds = [...new Set(entries.map((e) => (e as ScheduleEntry).subjectId))];
  const roomIds = [...new Set(entries.map((e) => (e as ScheduleEntry).roomId))];
  const instructorIds = [...new Set(entries.map((e) => (e as ScheduleEntry).instructorId))];

  const [{ data: subjects }, { data: rooms }, { data: users }] = await Promise.all([
    supabase.from("Subject").select(Q.subject).in("id", subjectIds),
    supabase.from("Room").select(Q.room).in("id", roomIds),
    supabase.from("User").select(USER_SCHEDULE_LOOKUP).in("id", instructorIds),
  ]);

  const subMap = new Map((subjects as Subject[] | null)?.map((s) => [s.id, s]) ?? []);
  const roomMap = new Map((rooms as Room[] | null)?.map((r) => [r.id, r]) ?? []);
  const userMap = new Map((users as User[] | null)?.map((u) => [u.id, u]) ?? []);

  const rows: ScheduleRowView[] = (entries as ScheduleEntry[]).map((e) => ({
    entry: e,
    subject: subMap.get(e.subjectId) ?? null,
    room: roomMap.get(e.roomId) ?? null,
    instructor: userMap.get(e.instructorId) ?? null,
    section,
  }));

  return { rows: sortScheduleRows(rows), section, program };
}

const WEEK_ORDER = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];

export function sortScheduleRows(rows: ScheduleRowView[]): ScheduleRowView[] {
  return [...rows].sort((a, b) => {
    const da = WEEK_ORDER.indexOf(a.entry.day);
    const db = WEEK_ORDER.indexOf(b.entry.day);
    if (da !== db) return da - db;
    return a.entry.startTime.localeCompare(b.entry.startTime);
  });
}

/** Faculty advisory section (chairman/college assigns on Faculty Profile). */
export async function getInstructorAdvisorySectionId(instructorUserId: string): Promise<string | null> {
  const supabase = await createSupabaseServerClient();
  if (!supabase) return null;
  const { data } = await supabase
    .from("FacultyProfile")
    .select("advisorySectionId")
    .eq("userId", instructorUserId)
    .maybeSingle();
  const id = (data as { advisorySectionId?: string | null } | null)?.advisorySectionId?.trim();
  return id || null;
}

export async function getInstructorScheduleRows(
  instructorUserId: string,
  academicPeriodId: string,
): Promise<{ rows: ScheduleRowView[]; sectionIds: string[] }> {
  const supabase = await createSupabaseServerClient();
  if (!supabase) return { rows: [], sectionIds: [] };

  const { data: entries, error } = await supabase
    .from("ScheduleEntry")
    .select(Q.scheduleEntry)
    .eq("academicPeriodId", academicPeriodId)
    .eq("instructorId", instructorUserId);

  if (error || !entries?.length) return { rows: [], sectionIds: [] };

  const sectionIds = [...new Set((entries as ScheduleEntry[]).map((e) => e.sectionId))];
  const subjectIds = [...new Set((entries as ScheduleEntry[]).map((e) => e.subjectId))];
  const roomIds = [...new Set((entries as ScheduleEntry[]).map((e) => e.roomId))];

  const [{ data: subjects }, { data: rooms }, { data: sections }] = await Promise.all([
    supabase.from("Subject").select(Q.subject).in("id", subjectIds),
    supabase.from("Room").select(Q.room).in("id", roomIds),
    supabase.from("Section").select(Q.section).in("id", sectionIds),
  ]);

  const subMap = new Map((subjects as Subject[] | null)?.map((s) => [s.id, s]) ?? []);
  const roomMap = new Map((rooms as Room[] | null)?.map((r) => [r.id, r]) ?? []);
  const secMap = new Map((sections as Section[] | null)?.map((s) => [s.id, s]) ?? []);

  const rows: ScheduleRowView[] = (entries as ScheduleEntry[]).map((e) => ({
    entry: e,
    subject: subMap.get(e.subjectId) ?? null,
    room: roomMap.get(e.roomId) ?? null,
    instructor: null,
    section: secMap.get(e.sectionId) ?? null,
  }));

  return { rows: sortScheduleRows(rows), sectionIds };
}

export async function countStudentsInSections(sectionIds: string[]): Promise<number> {
  if (sectionIds.length === 0) return 0;
  const supabase = await createSupabaseServerClient();
  if (!supabase) return 0;
  const { count, error } = await supabase
    .from("StudentProfile")
    .select("id", { count: "exact", head: true })
    .in("sectionId", sectionIds);
  if (error) return 0;
  return count ?? 0;
}

export async function getStudentRosterForSections(sectionIds: string[]): Promise<User[]> {
  if (sectionIds.length === 0) return [];
  const supabase = await createSupabaseServerClient();
  if (!supabase) return [];
  const { data: profiles } = await supabase.from("StudentProfile").select("userId").in("sectionId", sectionIds);
  const ids = [...new Set((profiles as { userId: string }[] | null)?.map((p) => p.userId) ?? [])];
  if (ids.length === 0) return [];
  const { data: users } = await supabase.from("User").select(USER_SCHEDULE_LOOKUP).in("id", ids).eq("role", "student");
  const list = (users as User[]) ?? [];
  const byId = new Map(list.map((u) => [u.id, u]));
  return [...byId.values()];
}

export async function getRecentNotifications(userId: string, limit = 6) {
  const supabase = await createSupabaseServerClient();
  if (!supabase) return [];
  const { data } = await supabase
    .from("Notification")
    .select(Q.notification)
    .eq("userId", userId)
    .order("createdAt", { ascending: false })
    .limit(limit);
  return data ?? [];
}

/**
 * Total weekly **contact hours** from `ScheduleEntry` rows: sum of (end − start) per row.
 * Same duration arithmetic as evaluator load summaries so Faculty portal, INS 5A, and policy checks stay aligned.
 */
export function sumWeeklyContactHours(rows: ScheduleRowView[]): number {
  let h = 0;
  for (const r of rows) {
    const [sh, sm] = r.entry.startTime.split(":").map((x) => parseInt(x, 10));
    const [eh, em] = r.entry.endTime.split(":").map((x) => parseInt(x, 10));
    const start = sh * 60 + (sm || 0);
    const end = eh * 60 + (em || 0);
    h += Math.max(0, (end - start) / 60);
  }
  return Math.round(h * 10) / 10;
}
