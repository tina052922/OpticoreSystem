/**
 * Scoped counts for Campus Intelligence dashboards (rooms, sections, faculty, draft schedules).
 * Uses the current academic period for draft counts; catalog counts reflect live Supabase rows.
 */
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { Q } from "@/lib/supabase/catalog-columns";
import { getCurrentAcademicPeriod } from "@/lib/server/dashboard-data";
import type { Program, Room, ScheduleEntry, Section, User } from "@/types/db";

export type CampusIntelligenceStats = {
  roomCount: number;
  sectionCount: number;
  facultyCount: number;
  /** ScheduleEntry rows with status `draft` for the current term within scope */
  draftScheduleCount: number;
};

type StatsMode =
  | { mode: "chairman_program"; collegeId: string | null; programId: string | null }
  | { mode: "college"; collegeId: string | null }
  | { mode: "gec_campus" }
  | { mode: "doi_campus" };

function roomMatchesScope(r: Room, collegeId: string | null, campusWide: boolean): boolean {
  if (campusWide) return true;
  if (!collegeId) return false;
  return r.collegeId == null || r.collegeId === collegeId;
}

function facultyMatchesScope(u: User, collegeId: string | null, campusWide: boolean): boolean {
  if (u.role !== "instructor" && u.role !== "chairman_admin") return false;
  if (campusWide) return true;
  return u.collegeId === collegeId;
}

/**
 * Returns dashboard metrics for the given role scope. Falls back to zeros if Supabase is unavailable.
 */
export async function getCampusIntelligenceStats(opts: StatsMode): Promise<CampusIntelligenceStats> {
  const supabase = await createSupabaseServerClient();
  if (!supabase) {
    return { roomCount: 0, sectionCount: 0, facultyCount: 0, draftScheduleCount: 0 };
  }

  const period = await getCurrentAcademicPeriod();
  const periodId = period?.id ?? null;

  const [{ data: programs }, { data: sections }, { data: rooms }, { data: users }] = await Promise.all([
    supabase.from("Program").select(Q.program),
    supabase.from("Section").select(Q.section),
    supabase.from("Room").select(Q.room),
    supabase.from("User").select("id,role,collegeId"),
  ]);

  const programList = (programs ?? []) as Program[];
  const sectionList = (sections ?? []) as Section[];
  const roomList = (rooms ?? []) as Room[];
  const userList = (users ?? []) as User[];

  let campusWide = false;
  let scopeCollegeId: string | null = null;
  let scopeProgramId: string | null = null;

  if (opts.mode === "gec_campus" || opts.mode === "doi_campus") {
    campusWide = true;
  } else if (opts.mode === "college") {
    scopeCollegeId = opts.collegeId;
  } else {
    scopeCollegeId = opts.collegeId;
    scopeProgramId = opts.programId;
  }

  const programIdsInScope = new Set<string>();
  if (campusWide) {
    programList.forEach((p) => programIdsInScope.add(p.id));
  } else if (opts.mode === "chairman_program" && scopeProgramId) {
    programIdsInScope.add(scopeProgramId);
  } else if (scopeCollegeId) {
    for (const p of programList) {
      if (p.collegeId === scopeCollegeId) programIdsInScope.add(p.id);
    }
  }

  const sectionIdsInScope = new Set(
    sectionList.filter((s) => programIdsInScope.has(s.programId)).map((s) => s.id),
  );

  /** Chairman may have `programId` but missing `collegeId` on the user row — infer college from `Program`. */
  const programCollegeId =
    opts.mode === "chairman_program" && scopeProgramId
      ? programList.find((p) => p.id === scopeProgramId)?.collegeId ?? null
      : null;
  const inferredCollegeId = scopeCollegeId ?? programCollegeId;

  const roomCount = campusWide
    ? roomList.length
    : inferredCollegeId
      ? roomList.filter((r) => roomMatchesScope(r, inferredCollegeId, false)).length
      : 0;

  const sectionCount = sectionIdsInScope.size;

  const facultyCount = campusWide
    ? userList.filter((u) => facultyMatchesScope(u, null, true)).length
    : userList.filter((u) => facultyMatchesScope(u, inferredCollegeId, false)).length;

  let draftScheduleCount = 0;
  if (periodId && sectionIdsInScope.size > 0) {
    const { data: draftRows, error } = await supabase
      .from("ScheduleEntry")
      .select("id,sectionId,status")
      .eq("academicPeriodId", periodId)
      .eq("status", "draft");
    if (!error && draftRows?.length) {
      draftScheduleCount = (draftRows as ScheduleEntry[]).filter((e) => sectionIdsInScope.has(e.sectionId)).length;
    }
  } else if (periodId && campusWide) {
    const { count, error } = await supabase
      .from("ScheduleEntry")
      .select("id", { count: "exact", head: true })
      .eq("academicPeriodId", periodId)
      .eq("status", "draft");
    if (!error) draftScheduleCount = count ?? 0;
  }

  return {
    roomCount,
    sectionCount,
    facultyCount,
    draftScheduleCount,
  };
}
