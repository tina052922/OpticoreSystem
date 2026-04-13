import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { fetchMyUserRowForAuth } from "@/lib/supabase/fetch-my-user-profile";
import { enrichCampusConflictIssues } from "@/lib/scheduling/conflict-enrichment";
import { scanAllScheduleConflicts } from "@/lib/scheduling/conflicts";
import type { ScheduleBlock } from "@/lib/scheduling/types";
import type { College, Program, Room, ScheduleEntry, Section, Subject, User } from "@/types/db";

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

/**
 * Campus-wide conflict scan for DOI: every ScheduleEntry in the term is checked for overlapping
 * faculty, section, and room usage (see scanAllScheduleConflicts / detectConflictsForEntry).
 */
export async function GET(req: Request) {
  const supabase = await createSupabaseServerClient();
  if (!supabase) {
    return NextResponse.json({ error: "Supabase not configured" }, { status: 503 });
  }

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const profile = await fetchMyUserRowForAuth(supabase, user.id);
  if (!profile || profile.role !== "doi_admin") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const periodId = new URL(req.url).searchParams.get("periodId")?.trim();
  if (!periodId) {
    return NextResponse.json({ error: "periodId is required" }, { status: 400 });
  }

  const { data: entries, error } = await supabase.from("ScheduleEntry").select("*").eq("academicPeriodId", periodId);
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  const entryList = (entries ?? []) as ScheduleEntry[];
  const blocks = entryList.map((e) => toBlock(e));
  const scan = scanAllScheduleConflicts(blocks);

  const subjectIds = [...new Set(entryList.map((e) => e.subjectId))];
  const sectionIds = [...new Set(entryList.map((e) => e.sectionId))];
  const roomIds = [...new Set(entryList.map((e) => e.roomId))];
  const userIds = [...new Set(entryList.map((e) => e.instructorId))];

  const [
    { data: subjectRows, error: es1 },
    { data: sectionRows, error: es2 },
    { data: roomRows, error: es3 },
    { data: userRows, error: es4 },
    { data: collegeRows, error: es5 },
  ] = await Promise.all([
    subjectIds.length
      ? supabase.from("Subject").select("*").in("id", subjectIds)
      : Promise.resolve({ data: [] as Subject[], error: null }),
    sectionIds.length
      ? supabase.from("Section").select("*").in("id", sectionIds)
      : Promise.resolve({ data: [] as Section[], error: null }),
    roomIds.length ? supabase.from("Room").select("*").in("id", roomIds) : Promise.resolve({ data: [] as Room[], error: null }),
    userIds.length
      ? supabase.from("User").select("id,email,name,role,collegeId,employeeId").in("id", userIds)
      : Promise.resolve({ data: [] as User[], error: null }),
    supabase.from("College").select("*"),
  ]);

  const lookupErr = es1 || es2 || es3 || es4 || es5;
  if (lookupErr) {
    return NextResponse.json({ error: lookupErr.message }, { status: 400 });
  }

  const subjectById = new Map<string, Subject>((subjectRows ?? []).map((s) => [s.id, s]));
  const sectionById = new Map<string, Section>((sectionRows ?? []).map((s) => [s.id, s]));
  const roomById = new Map<string, Room>((roomRows ?? []).map((r) => [r.id, r]));
  const userById = new Map<string, User>(
    (userRows ?? []).map((u) => [u.id, u as User]),
  );
  const programById = new Map<string, Program>();
  const programIds = [...new Set([...sectionById.values()].map((s) => s.programId))];
  if (programIds.length > 0) {
    const { data: programs, error: ep } = await supabase.from("Program").select("*").in("id", programIds);
    if (ep) return NextResponse.json({ error: ep.message }, { status: 400 });
    (programs ?? []).forEach((p) => programById.set(p.id, p as Program));
  }

  const collegeNameById = new Map<string, string>((collegeRows as College[] | null)?.map((c) => [c.id, c.name]) ?? []);

  const entryById = new Map(entryList.map((e) => [e.id, e]));
  const enrichedIssues = enrichCampusConflictIssues(
    scan.issues,
    entryById,
    subjectById,
    sectionById,
    roomById,
    userById,
    programById,
    collegeNameById,
  );

  return NextResponse.json({
    entryCount: blocks.length,
    conflictingEntryIds: [...scan.conflictingEntryIds],
    issueSummaries: scan.issueSummaries,
    issues: scan.issues,
    enrichedIssues,
  });
}
