import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import {
  getInstructorAdvisorySectionId,
  getInstructorScheduleRows,
  sumWeeklyContactHours,
} from "@/lib/server/dashboard-data";

/**
 * GET ?periodId= — instructor schedule summary for Campus Intelligence (no enrolled-student PII).
 * Section list = unique `ScheduleEntry.sectionId` plus advisory section from `FacultyProfile`.
 */
export async function GET(request: Request) {
  const supabase = await createSupabaseServerClient();
  if (!supabase) {
    return NextResponse.json({ error: "Server not configured." }, { status: 500 });
  }
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const periodId = new URL(request.url).searchParams.get("periodId")?.trim() ?? "";
  if (!periodId) {
    return NextResponse.json({ error: "periodId is required" }, { status: 400 });
  }

  const { data: row, error: roleErr } = await supabase.from("User").select("role").eq("id", user.id).maybeSingle();
  if (roleErr || row?.role !== "instructor") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { rows, sectionIds: scheduleSectionIds } = await getInstructorScheduleRows(user.id, periodId);
  /** Chairman sets advisory on FacultyProfile; include that section in the assigned list even with no class row. */
  const advisorySectionId = await getInstructorAdvisorySectionId(user.id);
  const sectionIds = [...new Set([...scheduleSectionIds, ...(advisorySectionId ? [advisorySectionId] : [])])];

  let advisorySectionName: string | null = null;
  if (advisorySectionId) {
    const { data: sec } = await supabase.from("Section").select("name").eq("id", advisorySectionId).maybeSingle();
    advisorySectionName = (sec as { name?: string } | null)?.name?.trim() ?? null;
  }

  const weeklyHours = sumWeeklyContactHours(rows);

  return NextResponse.json({
    rows,
    sectionIds,
    advisorySectionId,
    advisorySectionName,
    weeklyHours,
    weeklyMeetingRowCount: rows.length,
    /** Distinct sections (teaching + advisory) — shown on dashboard without student names. */
    assignedSectionCount: sectionIds.length,
  });
}
