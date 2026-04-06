import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { fetchMyUserRowForAuth } from "@/lib/supabase/fetch-my-user-profile";
import type { ScheduleChangeRequest } from "@/types/db";

export type ScheduleChangeRequestRow = ScheduleChangeRequest & {
  instructorName?: string;
  subjectCode?: string;
  sectionName?: string;
  currentDay?: string;
  currentStartTime?: string;
  currentEndTime?: string;
};

type ScheduleEntryRow = {
  id: string;
  day: string;
  startTime: string;
  endTime: string;
  subjectId: string;
  sectionId: string;
};

/** College Admin: list schedule change requests for their college. */
export async function GET() {
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
  if (!profile || profile.role !== "college_admin" || !profile.collegeId) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { data: rows, error } = await supabase
    .from("ScheduleChangeRequest")
    .select("*")
    .eq("collegeId", profile.collegeId)
    .order("createdAt", { ascending: false });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  const list = (rows ?? []) as ScheduleChangeRequest[];
  const instructorIds = [...new Set(list.map((r) => r.instructorId))];
  const entryIds = [...new Set(list.map((r) => r.scheduleEntryId))];

  const [{ data: users }, { data: entries }] = await Promise.all([
    instructorIds.length
      ? supabase.from("User").select("id, name").in("id", instructorIds)
      : { data: [] as { id: string; name: string }[] },
    entryIds.length
      ? supabase.from("ScheduleEntry").select("id, day, startTime, endTime, subjectId, sectionId").in("id", entryIds)
      : { data: [] as ScheduleEntryRow[] },
  ]);

  const nameById = Object.fromEntries((users ?? []).map((u: { id: string; name: string }) => [u.id, u.name]));
  const scheduleEntries = (entries ?? []) as ScheduleEntryRow[];
  const entryById = Object.fromEntries(scheduleEntries.map((e) => [e.id, e] as [string, ScheduleEntryRow]));

  const subjectIds = [...new Set(scheduleEntries.map((e) => e.subjectId))];
  const sectionIds = [...new Set(scheduleEntries.map((e) => e.sectionId))];

  const [{ data: subjects }, { data: sections }] = await Promise.all([
    subjectIds.length ? supabase.from("Subject").select("id, code").in("id", subjectIds) : { data: [] },
    sectionIds.length ? supabase.from("Section").select("id, name").in("id", sectionIds) : { data: [] },
  ]);

  const codeBySub = Object.fromEntries((subjects ?? []).map((s: { id: string; code: string }) => [s.id, s.code]));
  const nameBySec = Object.fromEntries((sections ?? []).map((s: { id: string; name: string }) => [s.id, s.name]));

  const enriched: ScheduleChangeRequestRow[] = list.map((r) => {
    const e = entryById[r.scheduleEntryId];
    return {
      ...r,
      instructorName: nameById[r.instructorId] ?? r.instructorId,
      subjectCode: e ? codeBySub[e.subjectId] : undefined,
      sectionName: e ? nameBySec[e.sectionId] : undefined,
      currentDay: e?.day,
      currentStartTime: e?.startTime,
      currentEndTime: e?.endTime,
    };
  });

  return NextResponse.json({ requests: enriched });
}
