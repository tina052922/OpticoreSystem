import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import {
  countStudentsInSections,
  getInstructorScheduleRows,
  getStudentRosterForSections,
  sumWeeklyContactHours,
} from "@/lib/server/dashboard-data";

/**
 * GET ?periodId= — hydrated instructor schedule + roster for the selected academic term.
 * Used by the faculty portal dashboard (semester filter in the shell).
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

  const { rows, sectionIds } = await getInstructorScheduleRows(user.id, periodId);
  const [studentCount, roster] = await Promise.all([
    countStudentsInSections(sectionIds),
    getStudentRosterForSections(sectionIds),
  ]);
  const weeklyHours = sumWeeklyContactHours(rows);

  return NextResponse.json({
    rows,
    sectionIds,
    studentCount,
    roster,
    weeklyHours,
  });
}
