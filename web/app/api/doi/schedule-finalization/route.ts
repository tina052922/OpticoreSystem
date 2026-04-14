/**
 * DOI schedule finalization — **only** this route (PATCH, authenticated `doi_admin`) may set
 * `ScheduleEntry.lockedByDoiAt` and `status: final` for a term. No inbox, college, or GEC code path
 * calls it; there are no triggers or cron jobs. Keep it that way so pre–VPAA testing stays on drafts.
 */
import { NextResponse } from "next/server";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { fetchMyUserRowForAuth } from "@/lib/supabase/fetch-my-user-profile";
import { notifyStakeholdersAfterDoiPublication } from "@/lib/server/doi-approval-notifications";
import { Q } from "@/lib/supabase/catalog-columns";

type PatchBody = {
  academicPeriodId?: string;
  action?: "approve" | "reject";
  signedByName?: string;
  signedAcknowledged?: boolean;
  notes?: string | null;
};

/** GET /api/doi/schedule-finalization?periodId= — current DOI decision row for the term. */
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

  const { data: row, error } = await supabase
    .from("DoiScheduleFinalization")
    .select(Q.doiScheduleFinalization)
    .eq("academicPeriodId", periodId)
    .maybeSingle();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  return NextResponse.json({ finalization: row });
}

/**
 * Approve/reject campus-wide schedule finalization. **Invoked only from DOI UI** (explicit button +
 * signature fields). On approve: locks all `ScheduleEntry` rows for the term via service role.
 */
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
  const academicPeriodId = body?.academicPeriodId?.trim();
  const action = body?.action;
  const signedByName = body?.signedByName?.trim() || null;
  const signedAcknowledged = Boolean(body?.signedAcknowledged);
  const notes = body?.notes?.trim() || null;

  if (!academicPeriodId) {
    return NextResponse.json({ error: "academicPeriodId is required" }, { status: 400 });
  }
  if (action !== "approve" && action !== "reject") {
    return NextResponse.json({ error: "action must be approve or reject" }, { status: 400 });
  }

  if (action === "approve" && (!signedByName || !signedAcknowledged)) {
    return NextResponse.json(
      { error: "Approval requires your name and confirmation that you are signing as DOI Admin." },
      { status: 400 },
    );
  }

  const now = new Date().toISOString();
  const status = action === "approve" ? "approved" : "rejected";

  const upsertPayload = {
    academicPeriodId,
    status,
    signedByName: action === "approve" ? signedByName : null,
    signedAt: action === "approve" ? now : null,
    signedAcknowledged: action === "approve" ? signedAcknowledged : false,
    publishedAt: action === "approve" ? now : null,
    decidedById: user.id,
    decidedAt: now,
    notes,
  };

  const { data: saved, error: upErr } = await supabase
    .from("DoiScheduleFinalization")
    .upsert(upsertPayload, { onConflict: "academicPeriodId" })
    .select(Q.doiScheduleFinalization)
    .maybeSingle();

  if (upErr) {
    return NextResponse.json({ error: upErr.message }, { status: 400 });
  }

  if (action === "approve") {
    const admin = createSupabaseAdminClient();
    if (!admin) {
      return NextResponse.json(
        { error: "Server is not configured to publish schedules (missing service role)." },
        { status: 503 },
      );
    }

    const lockTs = now;
    const { error: schErr } = await admin
      .from("ScheduleEntry")
      .update({ status: "final", lockedByDoiAt: lockTs })
      .eq("academicPeriodId", academicPeriodId);

    if (schErr) {
      return NextResponse.json(
        { error: "Saved decision but could not lock and finalize schedule rows: " + schErr.message },
        { status: 500 },
      );
    }

    const { data: periodRow } = await admin.from("AcademicPeriod").select("name").eq("id", academicPeriodId).maybeSingle();
    const periodName = (periodRow as { name?: string } | null)?.name ?? "Selected term";

    await notifyStakeholdersAfterDoiPublication(admin, academicPeriodId, periodName);
  }

  return NextResponse.json({ ok: true, finalization: saved });
}
