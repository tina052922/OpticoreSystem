import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { fetchMyUserRowForAuth } from "@/lib/supabase/fetch-my-user-profile";
import { checkConflictForProposedMove } from "@/lib/schedule-change/conflict-check";
import { suggestMitigationForScheduleChange } from "@/lib/schedule-change/suggested-mitigation";
import { Q } from "@/lib/supabase/catalog-columns";
import { buildScheduleChangeAlternatives } from "@/lib/schedule-change/schedule-change-alternatives";
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

  const hitsEnriched = await enrichConflictHitsForDisplay(supabase, hits, allCampus);

  const suggestedMitigation =
    severity !== "none"
      ? suggestMitigationForScheduleChange(e, requestedDay, requestedStartTime, requestedEndTime, allCampus, rooms)
      : null;

  const alternativeSolutions = buildScheduleChangeAlternatives(
    e,
    requestedDay,
    requestedStartTime,
    requestedEndTime,
    allCampus,
    rooms,
  );

  const conflictDetails = {
    hits: hitsEnriched,
    suggestedMitigation: suggestedMitigation ?? undefined,
    alternativeSolutions,
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
    alternativeSolutions,
    summary: summarizeHits(severity, hitsEnriched.length),
  });
}

function summarizeHits(severity: string, n: number): string {
  if (severity === "none")
    return "No conflicts (campus-wide). Safe to approve the instructor slot or listed alternative.";
  if (severity === "small")
    return `Conflicts found (${n}). Approval is blocked for the instructor’s slot until you choose a clash-free alternative or fix the timetable.`;
  return `Multiple conflicts (${n}). Approval is blocked until a clash-free alternative is chosen or clashes are cleared.`;
}
