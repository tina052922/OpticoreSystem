import { NextResponse } from "next/server";
import { appendWorkflowMessage } from "@/lib/inbox-store";
import { insertAuditLog } from "@/lib/server/audit-log";
import { insertWorkflowInboxMessage } from "@/lib/server/workflow-inbox";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { fetchMyUserRowForAuth } from "@/lib/supabase/fetch-my-user-profile";

type Body = {
  collegeId?: string | null;
  academicPeriodId?: string | null;
  sectionId?: string | null;
  sectionName?: string | null;
  rowCount?: number;
};

/**
 * After GEC Chairman saves vacant GEC / new schedule rows, notify College Admin (scoped college)
 * and DOI so they can review campus-wide in the Central Hub Evaluator and run VPAA approval.
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
  if (!profile || profile.role !== "gec_chairman") {
    return NextResponse.json({ error: "Only GEC Chairman can send this notification" }, { status: 403 });
  }

  const body = (await req.json().catch(() => null)) as Body | null;
  const collegeId = body?.collegeId?.trim();
  const academicPeriodId = body?.academicPeriodId?.trim();
  const sectionId = body?.sectionId?.trim();
  const sectionName = body?.sectionName?.trim() || "—";
  const rowCount = typeof body?.rowCount === "number" ? body.rowCount : 0;

  if (!collegeId || !academicPeriodId) {
    return NextResponse.json({ error: "collegeId and academicPeriodId are required" }, { status: 400 });
  }

  let periodLabel = academicPeriodId;
  const { data: ap } = await supabase.from("AcademicPeriod").select("name").eq("id", academicPeriodId).maybeSingle();
  if (ap && typeof (ap as { name?: string }).name === "string") {
    periodLabel = (ap as { name: string }).name;
  }

  const subject = `GEC schedule plotted — ${sectionName}`;
  const text = [
    `The GEC Chairman has saved schedule updates for section “${sectionName}”.`,
    ``,
    `Academic term: ${periodLabel}`,
    `Rows saved this action: ${rowCount}`,
    sectionId ? `Section id: ${sectionId}` : null,
    ``,
    `College Admin: review the section in your hub if needed.`,
    `DOI / VPAA: open Central Hub Evaluator → choose “All colleges (campus-wide)” to view the full master schedule (including GEC subjects), run campus-wide conflict detection, then approve the term under Formal approval when ready.`,
  ]
    .filter(Boolean)
    .join("\n");

  const admin = createSupabaseAdminClient();
  const db = admin ?? supabase;

  const { error: wfErr } = await insertWorkflowInboxMessage(db, {
    senderId: user.id,
    collegeId,
    fromLabel: "GEC Chairman",
    toLabel: "College Admin & DOI (VPAA)",
    subject,
    body: text,
    workflowStage: "gec_schedule_update",
    mailFor: ["college", "doi"],
    sentFor: ["gec"],
    payload: {
      academicPeriodId,
      sectionId: sectionId ?? null,
      rowCount,
      kind: "gec_schedule_save",
    },
  });

  if (wfErr) {
    return NextResponse.json(
      {
        ok: false,
        error: wfErr,
        hint: admin
          ? undefined
          : "If this is an RLS error, set SUPABASE_SERVICE_ROLE_KEY in web/.env.local so cross-college workflow mail can be inserted.",
      },
      { status: 400 },
    );
  }

  await insertAuditLog(supabase, {
    actorId: user.id,
    collegeId,
    action: "gec.schedule_save_notify",
    entityType: "ScheduleEntry",
    entityId: sectionId ?? null,
    details: { academicPeriodId, sectionName, rowCount },
  });

  appendWorkflowMessage({
    from: "GEC Chairman",
    to: "College Admin & DOI (VPAA)",
    subject,
    body: text,
    mailFor: ["college", "doi"],
    sentFor: ["gec"],
    workflowStage: "gec_schedule_update",
    status: "Unread",
  });

  return NextResponse.json({ ok: true });
}
