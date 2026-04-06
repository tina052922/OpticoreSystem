import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { fetchMyUserRowForAuth } from "@/lib/supabase/fetch-my-user-profile";
import { scanAllScheduleConflicts } from "@/lib/scheduling/conflicts";
import type { ScheduleBlock } from "@/lib/scheduling/types";
import type { ScheduleEntry } from "@/types/db";

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

  const blocks = (entries ?? []).map((e) => toBlock(e as ScheduleEntry));
  const scan = scanAllScheduleConflicts(blocks);

  return NextResponse.json({
    entryCount: blocks.length,
    conflictingEntryIds: [...scan.conflictingEntryIds],
    issueSummaries: scan.issueSummaries,
    issues: scan.issues,
  });
}
