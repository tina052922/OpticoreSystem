import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { fetchMyUserRowForAuth } from "@/lib/supabase/fetch-my-user-profile";
import { checkConflictForProposedMove } from "@/lib/schedule-change/conflict-check";
import { suggestMitigationForScheduleChange } from "@/lib/schedule-change/suggested-mitigation";
import { Q } from "@/lib/supabase/catalog-columns";
import { enrichConflictHitsForDisplay } from "@/lib/schedule-change/enrich-conflict-hits";
import { getRoomsForCollege, getScheduleEntriesForAcademicPeriod } from "@/lib/server/schedule-change-queries";
import type { ScheduleEntry } from "@/types/db";

type Ctx = { params: Promise<{ id: string }> };

/**
 * Runs conflict checker for the proposed new slot; stores severity on the pending request.
 */
export async function POST(_req: Request, ctx: Ctx) {
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
  if (!profile || profile.role !== "college_admin" || !profile.collegeId) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { id } = await ctx.params;

  const { data: reqRow, error: fetchErr } = await supabase
    .from("ScheduleChangeRequest")
    .select(Q.scheduleChangeRequest)
    .eq("id", id)
    .eq("collegeId", profile.collegeId)
    .maybeSingle();

  if (fetchErr || !reqRow) {
    return NextResponse.json({ error: "Request not found" }, { status: 404 });
  }

  if ((reqRow as { status: string }).status !== "pending") {
    return NextResponse.json({ error: "Only pending requests can be checked" }, { status: 400 });
  }

  const { data: entry, error: eErr } = await supabase
    .from("ScheduleEntry")
    .select(Q.scheduleEntry)
    .eq("id", (reqRow as { scheduleEntryId: string }).scheduleEntryId)
    .maybeSingle();

  if (eErr || !entry) {
    return NextResponse.json({ error: "Schedule entry missing" }, { status: 400 });
  }

  const e = entry as ScheduleEntry;
  const periodId = e.academicPeriodId;
  /** Campus-wide: all programs/sections for this term (not only this college). */
  const allCampus = await getScheduleEntriesForAcademicPeriod(supabase, periodId);
  const rooms = await getRoomsForCollege(supabase, profile.collegeId);

  const requestedDay = (reqRow as { requestedDay: string }).requestedDay;
  const requestedStartTime = (reqRow as { requestedStartTime: string }).requestedStartTime;
  const requestedEndTime = (reqRow as { requestedEndTime: string }).requestedEndTime;

  const { severity, hits } = checkConflictForProposedMove(e, requestedDay, requestedStartTime, requestedEndTime, allCampus);

  const suggestedMitigation =
    severity !== "none"
      ? suggestMitigationForScheduleChange(e, requestedDay, requestedStartTime, requestedEndTime, allCampus, rooms)
      : null;

  const hitsEnriched = await enrichConflictHitsForDisplay(supabase, hits, allCampus);

  const conflictDetails = {
    hits: hitsEnriched,
    suggestedMitigation: suggestedMitigation ?? undefined,
  };

  const { error: upErr } = await supabase
    .from("ScheduleChangeRequest")
    .update({
      conflictSeverity: severity,
      conflictDetails: conflictDetails as unknown as Record<string, unknown>,
    })
    .eq("id", id);

  if (upErr) {
    return NextResponse.json({ error: upErr.message }, { status: 400 });
  }

  return NextResponse.json({
    severity,
    hits: hitsEnriched,
    suggestedMitigation,
    summary: summarizeHits(severity, hitsEnriched.length),
  });
}

function summarizeHits(severity: string, n: number): string {
  if (severity === "none")
    return "No conflicts detected (campus-wide scan: all programs and sections this term). Schedule can be approved.";
  if (severity === "small")
    return `Severity: small — ${n} issue(s) (campus-wide). Review each conflict below, suggested mitigation (if any), add a note, then approve or approve with solution.`;
  return `Severity: large — ${n} issue(s) (campus-wide). Reject or resolve conflicts on the master schedule before approving.`;
}
