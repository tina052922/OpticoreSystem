import { NextResponse } from "next/server";
import { appendWorkflowMessage } from "@/lib/inbox-store";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { fetchMyUserRowForAuth } from "@/lib/supabase/fetch-my-user-profile";
import { insertWorkflowInboxMessage } from "@/lib/server/workflow-inbox";

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
 * ScheduleChangeRequest + College Admin inbox notice.
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
    .select("*")
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

  const { data: subj } = await supabase.from("Subject").select("code").eq("id", (entry as { subjectId: string }).subjectId).maybeSingle();
  const { data: sec } = await supabase.from("Section").select("name").eq("id", (entry as { sectionId: string }).sectionId).maybeSingle();
  const code = (subj as { code: string } | null)?.code ?? "—";
  const secName = (sec as { name: string } | null)?.name ?? "—";

  const title = `Schedule change — ${code} (${secName})`;
  const text = [
    `Request id: ${inserted.id}`,
    `Instructor: ${profile.name}`,
    `Subject / section: ${code} · ${secName}`,
    `Current: ${(entry as { day: string }).day} ${(entry as { startTime: string }).startTime}–${(entry as { endTime: string }).endTime}`,
    `Requested: ${requestedDay} ${requestedStartTime}–${requestedEndTime}`,
    ``,
    `Reason:`,
    reason,
    ``,
    `Open Schedule change requests in the College Admin portal to review, run conflict check, and approve or reject.`,
  ].join("\n");

  const { error: wfErr } = await insertWorkflowInboxMessage(supabase, {
    senderId: user.id,
    collegeId: profile.collegeId,
    fromLabel: profile.name,
    toLabel: "College Admin",
    subject: title,
    body: text,
    workflowStage: "schedule_change_request",
    mailFor: ["college"],
    sentFor: ["college"],
  });

  if (wfErr) {
    await supabase.from("ScheduleChangeRequest").delete().eq("id", inserted.id);
    return NextResponse.json({ error: wfErr }, { status: 400 });
  }

  appendWorkflowMessage({
    from: profile.name,
    to: "College Admin",
    subject: title,
    body: text,
    workflowStage: "schedule_change_request",
    mailFor: ["college"],
    sentFor: ["college"],
    status: "Unread",
  });

  return NextResponse.json({ ok: true, id: inserted.id });
}
