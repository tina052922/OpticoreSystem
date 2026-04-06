import { NextResponse } from "next/server";
import { appendWorkflowMessage } from "@/lib/inbox-store";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { fetchMyUserRowForAuth } from "@/lib/supabase/fetch-my-user-profile";
import { insertWorkflowInboxMessage } from "@/lib/server/workflow-inbox";

type Body = {
  subjectCode?: string;
  sectionName?: string;
  currentSlot?: string;
  requestedSlot?: string;
  reason?: string;
};

/**
 * Instructor submits a schedule change request; message is queued for Chairman (same college) via WorkflowInbox.
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
  const reason = body?.reason?.trim() ?? "";
  if (reason.length < 8) {
    return NextResponse.json({ error: "Please provide a clear reason (at least 8 characters)." }, { status: 400 });
  }

  const subjectCode = body?.subjectCode?.trim() || "—";
  const sectionName = body?.sectionName?.trim() || "—";
  const currentSlot = body?.currentSlot?.trim() || "—";
  const requestedSlot = body?.requestedSlot?.trim() || "—";

  const title = `Schedule change — ${subjectCode} (${sectionName})`;
  const text = [
    `Instructor: ${profile.name}`,
    `Subject / section: ${subjectCode} · ${sectionName}`,
    `Current slot: ${currentSlot}`,
    `Requested slot: ${requestedSlot}`,
    ``,
    `Reason:`,
    reason,
  ].join("\n");

  const { error } = await insertWorkflowInboxMessage(supabase, {
    senderId: user.id,
    collegeId: profile.collegeId,
    fromLabel: profile.name,
    toLabel: "Chairman / scheduling",
    subject: title,
    body: text,
    workflowStage: "schedule_change_request",
    mailFor: ["chairman"],
    sentFor: ["chairman"],
  });

  if (error) {
    return NextResponse.json({ error }, { status: 400 });
  }

  appendWorkflowMessage({
    from: profile.name,
    to: "Chairman / scheduling",
    subject: title,
    body: text,
    workflowStage: "schedule_change_request",
    mailFor: ["chairman"],
    sentFor: ["chairman"],
    status: "Unread",
  });

  return NextResponse.json({ ok: true });
}
