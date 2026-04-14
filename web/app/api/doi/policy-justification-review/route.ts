/**
 * VPAA/DOI records a decision on a chairman-submitted `ScheduleLoadJustification`.
 * Authenticated `doi_admin` only; updates via user session (RLS). Optional service-role fan-out for notifications.
 */
import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { fetchMyUserRowForAuth } from "@/lib/supabase/fetch-my-user-profile";
import { insertAuditLog } from "@/lib/server/audit-log";
import { Q } from "@/lib/supabase/catalog-columns";

type PatchBody = {
  justificationId?: string;
  decision?: "accepted" | "rejected";
  note?: string | null;
};

export async function PATCH(req: Request) {
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

  const body = (await req.json().catch(() => null)) as PatchBody | null;
  const justificationId = body?.justificationId?.trim();
  const decision = body?.decision;
  const note = body?.note?.trim() || null;

  if (!justificationId) {
    return NextResponse.json({ error: "justificationId is required" }, { status: 400 });
  }
  if (decision !== "accepted" && decision !== "rejected") {
    return NextResponse.json({ error: "decision must be accepted or rejected" }, { status: 400 });
  }

  const { data: row, error: fetchErr } = await supabase
    .from("ScheduleLoadJustification")
    .select(Q.scheduleLoadJustification)
    .eq("id", justificationId)
    .maybeSingle();

  if (fetchErr) {
    return NextResponse.json({ error: fetchErr.message }, { status: 400 });
  }
  if (!row) {
    return NextResponse.json({ error: "Justification not found" }, { status: 404 });
  }

  const r = row as { id: string; collegeId: string; academicPeriodId: string; authorUserId: string };

  const [{ data: colRow }, { data: perRow }] = await Promise.all([
    supabase.from("College").select("name").eq("id", r.collegeId).maybeSingle(),
    supabase.from("AcademicPeriod").select("name").eq("id", r.academicPeriodId).maybeSingle(),
  ]);

  const now = new Date().toISOString();
  const { data: updated, error: upErr } = await supabase
    .from("ScheduleLoadJustification")
    .update({
      doiDecision: decision,
      doiReviewedAt: now,
      doiReviewedById: user.id,
      doiReviewNote: note,
    })
    .eq("id", justificationId)
    .select(Q.scheduleLoadJustification)
    .maybeSingle();

  if (upErr) {
    return NextResponse.json({ error: upErr.message }, { status: 400 });
  }

  const collegeName = (colRow as { name?: string } | null)?.name ?? "your college";
  const periodName = (perRow as { name?: string } | null)?.name ?? "the selected term";
  const verb = decision === "accepted" ? "accepted" : "rejected";

  await insertAuditLog(supabase, {
    actorId: user.id,
    collegeId: r.collegeId,
    action: `doi.policy_justification_${decision}`,
    entityType: "ScheduleLoadJustification",
    entityId: justificationId,
    details: { academicPeriodId: r.academicPeriodId, note },
  });

  const admin = createSupabaseAdminClient();
  if (admin) {
    const msg = `VPAA/DOI ${verb} your faculty load policy justification for ${periodName} (${collegeName}).${note ? ` Note: ${note}` : ""} You may adjust the draft schedule in the Evaluator if needed.`;
    const { error: nErr } = await admin.from("Notification").insert({ userId: r.authorUserId, message: msg });
    if (nErr) {
      return NextResponse.json(
        { ok: true, justification: updated, warning: `Saved review but notification failed: ${nErr.message}` },
        { status: 200 },
      );
    }
  }

  return NextResponse.json({ ok: true, justification: updated });
}
