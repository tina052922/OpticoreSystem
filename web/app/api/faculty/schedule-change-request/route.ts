import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { fetchMyUserRowForAuth } from "@/lib/supabase/fetch-my-user-profile";
import { Q } from "@/lib/supabase/catalog-columns";

type Body = {
  scheduleEntryId?: string;
  requestedDay?: string;
  requestedStartTime?: string;
  requestedEndTime?: string;
  reason?: string;
};

const INVALID_SCHEDULE_MSG = "Invalid request – No schedule found for this faculty.";

/**
 * Validates that the schedule entry exists and belongs to the instructor, then creates
 * `ScheduleChangeRequest`. In-app notifications are created by the DB trigger
 * `trg_schedule_change_request_notify_insert` (see Supabase migrations) so delivery stays
 * reliable regardless of Notification RLS from the browser session.
 */
export async function POST(req: Request) {
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
  if (!profile || profile.role !== "instructor" || !profile.collegeId) {
    return NextResponse.json({ error: "Only instructors with a college assignment can submit requests" }, { status: 403 });
  }

  const body = (await req.json().catch(() => null)) as Body | null;
  const scheduleEntryId = body?.scheduleEntryId?.trim() ?? "";
  const requestedDay = body?.requestedDay?.trim() ?? "";
  const requestedStartTime = body?.requestedStartTime?.trim() ?? "";
  const requestedEndTime = body?.requestedEndTime?.trim() ?? "";
  const reason = body?.reason?.trim() ?? "";

  if (!scheduleEntryId) {
    return NextResponse.json({ error: INVALID_SCHEDULE_MSG }, { status: 400 });
  }
  if (!requestedDay || !requestedStartTime || !requestedEndTime) {
    return NextResponse.json({ error: "Requested day and time are required." }, { status: 400 });
  }
  if (reason.length < 8) {
    return NextResponse.json({ error: "Please provide a clear reason (at least 8 characters)." }, { status: 400 });
  }

  const { data: entry, error: entryErr } = await supabase
    .from("ScheduleEntry")
    .select(Q.scheduleEntry)
    .eq("id", scheduleEntryId)
    .eq("instructorId", user.id)
    .maybeSingle();

  if (entryErr || !entry) {
    return NextResponse.json({ error: INVALID_SCHEDULE_MSG }, { status: 400 });
  }

  const academicPeriodId = (entry as { academicPeriodId: string }).academicPeriodId;

  const { data: inserted, error: insErr } = await supabase
    .from("ScheduleChangeRequest")
    .insert({
      academicPeriodId,
      scheduleEntryId,
      instructorId: user.id,
      collegeId: profile.collegeId,
      requestedDay,
      requestedStartTime,
      requestedEndTime,
      reason,
      status: "pending",
    })
    .select("id")
    .maybeSingle();

  if (insErr || !inserted) {
    return NextResponse.json({ error: insErr?.message ?? "Could not save request" }, { status: 400 });
  }

  return NextResponse.json({ ok: true, id: inserted.id });
}

