import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { getStudentScheduleRows } from "@/lib/server/dashboard-data";

/**
 * GET ?periodId= — student schedule rows + section/program for the selected academic term.
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
  if (roleErr || row?.role !== "student") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { rows, section, program } = await getStudentScheduleRows(user.id, periodId);
  return NextResponse.json({ rows, section, program });
}
