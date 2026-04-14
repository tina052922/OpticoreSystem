import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { fetchMyUserRowForAuth } from "@/lib/supabase/fetch-my-user-profile";
import { checkConflictForProposedMove } from "@/lib/schedule-change/conflict-check";
import { Q } from "@/lib/supabase/catalog-columns";
import { getScheduleEntriesForCollegePeriod } from "@/lib/server/schedule-change-queries";
import type { ScheduleChangeStatus } from "@/types/db";
import type { ScheduleEntry } from "@/types/db";

type Ctx = { params: Promise<{ id: string }> };

type PatchBody = {
  action?: "approve" | "reject" | "approve_with_solution";
  adminSuggestion?: string | null;
  /** When true, applies `roomId` from the last conflict check’s suggested mitigation (if present). */
  applySuggestedMitigation?: boolean;
};

/**
 * College Admin approves (applies new slot to ScheduleEntry) or rejects; notifies instructor.
 */
export async function PATCH(req: Request, ctx: Ctx) {
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
  const body = (await req.json().catch(() => null)) as PatchBody | null;
  const action = body?.action;
  const adminSuggestion = body?.adminSuggestion?.trim() || null;
  const applySuggestedMitigation = Boolean(body?.applySuggestedMitigation);

  if (action !== "approve" && action !== "reject" && action !== "approve_with_solution") {
    return NextResponse.json({ error: "action must be approve, reject, or approve_with_solution" }, { status: 400 });
  }

  const { data: reqRow, error: fetchErr } = await supabase
    .from("ScheduleChangeRequest")
    .select(Q.scheduleChangeRequest)
    .eq("id", id)
    .eq("collegeId", profile.collegeId)
    .maybeSingle();

  if (fetchErr || !reqRow) {
    return NextResponse.json({ error: "Request not found" }, { status: 404 });
  }

  const row = reqRow as {
    status: string;
    instructorId: string;
    scheduleEntryId: string;
    requestedDay: string;
    requestedStartTime: string;
    requestedEndTime: string;
    conflictDetails: unknown;
  };

  if (row.status !== "pending") {
    return NextResponse.json({ error: "This request was already decided" }, { status: 400 });
  }

  const now = new Date().toISOString();

  if (action === "reject") {
    await supabase
      .from("ScheduleChangeRequest")
      .update({
        status: "rejected" as ScheduleChangeStatus,
        reviewedById: user.id,
        reviewedAt: now,
        adminSuggestion: adminSuggestion,
      })
      .eq("id", id);

    const msg = adminSuggestion
      ? `Your schedule change request was not approved. Note: ${adminSuggestion}`
      : "Your schedule change request was reviewed and not approved. Contact College Admin if you need clarification.";
    await notifyInstructor(supabase, row.instructorId, "Schedule change request rejected", msg);
    return NextResponse.json({ ok: true, status: "rejected" });
  }

  const { data: entry, error: entErr } = await supabase
    .from("ScheduleEntry")
    .select(Q.scheduleEntry)
    .eq("id", row.scheduleEntryId)
    .maybeSingle();
  if (entErr || !entry) {
    return NextResponse.json({ error: "Schedule entry no longer exists" }, { status: 400 });
  }

  const e = entry as ScheduleEntry;
  if (e.lockedByDoiAt) {
    return NextResponse.json(
      {
        error:
          "This term’s master schedule was published by VPAA/DOI and is locked. Schedule changes cannot be applied here.",
      },
      { status: 423 },
    );
  }
  const allInCollege = await getScheduleEntriesForCollegePeriod(supabase, profile.collegeId, e.academicPeriodId);
  const { severity, hits } = checkConflictForProposedMove(
    e,
    row.requestedDay,
    row.requestedStartTime,
    row.requestedEndTime,
    allInCollege,
  );

  await supabase
    .from("ScheduleChangeRequest")
    .update({
      conflictSeverity: severity,
      conflictDetails: { hits },
    })
    .eq("id", id);

  if (severity === "large") {
    return NextResponse.json(
      {
        error:
          "Conflicts are too large to approve safely. Reject this request or adjust the master schedule first.",
        severity,
        hits,
      },
      { status: 409 },
    );
  }

  if (action === "approve_with_solution" && !adminSuggestion) {
    return NextResponse.json({ error: "approve_with_solution requires adminSuggestion text." }, { status: 400 });
  }

  if (severity === "small" && action === "approve" && !adminSuggestion) {
    return NextResponse.json(
      {
        error:
          "Small conflicts remain — add adminSuggestion (mitigation) or use approve_with_solution with a note.",
        severity,
        hits,
      },
      { status: 400 },
    );
  }

  const finalStatus: ScheduleChangeStatus =
    severity === "small" || action === "approve_with_solution" ? "approved_with_solution" : "approved";

  const detailsPayload = row.conflictDetails as
    | { suggestedMitigation?: { roomId?: string; label?: string } }
    | null
    | undefined;
  const mitigationRoomId =
    applySuggestedMitigation && detailsPayload?.suggestedMitigation?.roomId
      ? detailsPayload.suggestedMitigation.roomId
      : undefined;

  const { error: updEntryErr } = await supabase
    .from("ScheduleEntry")
    .update({
      day: row.requestedDay,
      startTime: row.requestedStartTime,
      endTime: row.requestedEndTime,
      status: "draft",
      ...(mitigationRoomId ? { roomId: mitigationRoomId } : {}),
    })
    .eq("id", row.scheduleEntryId);

  if (updEntryErr) {
    return NextResponse.json({ error: updEntryErr.message }, { status: 400 });
  }

  await supabase
    .from("ScheduleChangeRequest")
    .update({
      status: finalStatus,
      reviewedById: user.id,
      reviewedAt: now,
      adminSuggestion: adminSuggestion,
    })
    .eq("id", id);

  const slotLabel = `${row.requestedDay} ${row.requestedStartTime}–${row.requestedEndTime}`;
  const notifBody =
    finalStatus === "approved_with_solution"
      ? `Approved with note: ${adminSuggestion ?? "—"} — applied slot: ${slotLabel}.`
      : `Approved. Your class is now scheduled at ${slotLabel}.`;

  await notifyInstructor(supabase, row.instructorId, "Schedule change approved", notifBody);

  return NextResponse.json({ ok: true, status: finalStatus, severity, hits });
}

async function notifyInstructor(
  supabase: NonNullable<Awaited<ReturnType<typeof createSupabaseServerClient>>>,
  instructorId: string,
  title: string,
  message: string,
) {
  await supabase.from("Notification").insert({
    userId: instructorId,
    message: `${title}: ${message}`,
    isRead: false,
  });
}
