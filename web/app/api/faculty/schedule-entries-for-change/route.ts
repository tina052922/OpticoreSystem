import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { fetchMyUserRowForAuth } from "@/lib/supabase/fetch-my-user-profile";
import { getInstructorScheduleRows } from "@/lib/server/dashboard-data";
import { Q } from "@/lib/supabase/catalog-columns";
import type { AcademicPeriod } from "@/types/db";

export type ScheduleEntryOption = {
  id: string;
  subjectCode: string;
  sectionName: string;
  day: string;
  startTime: string;
  endTime: string;
  label: string;
};

/**
 * Lists schedule rows for the instructor for the given academic period (semester filter on My Schedule).
 * Query: `periodId` (required) — must match the shell’s selected term.
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
  if (!profile || profile.role !== "instructor") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const periodId = new URL(req.url).searchParams.get("periodId")?.trim() ?? "";
  if (!periodId) {
    return NextResponse.json({ error: "periodId is required" }, { status: 400 });
  }

  const { data: periodRow } = await supabase
    .from("AcademicPeriod")
    .select(Q.academicPeriod)
    .eq("id", periodId)
    .maybeSingle();
  const period = (periodRow as AcademicPeriod | null) ?? null;
  if (!period) {
    return NextResponse.json({ entries: [] as ScheduleEntryOption[], periodName: null, academicPeriodId: null });
  }

  const { rows } = await getInstructorScheduleRows(profile.id, period.id);
  const entries: ScheduleEntryOption[] = rows.map((r) => {
    const code = r.subject?.code ?? "—";
    const sec = r.section?.name ?? "—";
    return {
      id: r.entry.id,
      subjectCode: code,
      sectionName: sec,
      day: r.entry.day,
      startTime: r.entry.startTime,
      endTime: r.entry.endTime,
      label: `${code} · ${sec} · ${r.entry.day} ${r.entry.startTime}–${r.entry.endTime}`,
    };
  });

  return NextResponse.json({ entries, periodName: period.name, academicPeriodId: period.id });
}

