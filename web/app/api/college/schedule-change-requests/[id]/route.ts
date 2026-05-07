import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { fetchMyUserRowForAuth } from "@/lib/supabase/fetch-my-user-profile";
import { notifyScheduleChangeApproved } from "@/lib/server/notify-schedule-change-approved";
import { checkConflictForProposedMove } from "@/lib/schedule-change/conflict-check";
import { Q } from "@/lib/supabase/catalog-columns";
import { enrichConflictHitsForDisplay } from "@/lib/schedule-change/enrich-conflict-hits";
import { getScheduleEntriesForAcademicPeriod } from "@/lib/server/schedule-change-queries";
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
    const { error: rejUpdErr } = await supabase
      .from("ScheduleChangeRequest")
      .update({
        status: "rejected" as ScheduleChangeStatus,
        reviewedById: user.id,
        reviewedAt: now,
        adminSuggestion: adminSuggestion,
      })
      .eq("id", id);
    if (rejUpdErr) {
      return NextResponse.json({ error: rejUpdErr.message }, { status: 400 });
    }

    const msg = adminSuggestion
      ? `Rejected. College Admin note: ${adminSuggestion}`
      : "Rejected. Contact College Admin if you need clarification.";
    const { error: rejNotifErr } = await notifyInstructor(supabase, row.instructorId, "Schedule change request", msg);
    if (rejNotifErr) {
      console.error("[schedule-change-requests] reject notification insert failed", rejNotifErr);
    }
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
  const allCampus = await getScheduleEntriesForAcademicPeriod(supabase, e.academicPeriodId);
  const { severity, hits } = checkConflictForProposedMove(
    e,
    row.requestedDay,
    row.requestedStartTime,
    row.requestedEndTime,
    allCampus,
  );

  const hitsEnriched = await enrichConflictHitsForDisplay(supabase, hits, allCampus);

  await supabase
    .from("ScheduleChangeRequest")
    .update({
      conflictSeverity: severity,
      conflictDetails: { hits: hitsEnriched },
    })
    .eq("id", id);

  if (severity === "large") {
    return NextResponse.json(
      {
        error:
          "Conflicts are too large to approve safely (campus-wide scan). Reject this request or adjust the master schedule first.",
        severity,
        hits: hitsEnriched,
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
        hits: hitsEnriched,
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
  const roomIdApplied = mitigationRoomId ?? e.roomId;

  const admin = createSupabaseAdminClient();
  if (admin) {
    try {
      const { data: secRow } = await admin.from("Section").select("id, name, programId").eq("id", e.sectionId).maybeSingle();
      const { data: progRow } = await admin
        .from("Program")
        .select("id, collegeId")
        .eq("id", (secRow as { programId?: string } | null)?.programId ?? "")
        .maybeSingle();
      const { data: subRow } = await admin.from("Subject").select("code").eq("id", e.subjectId).maybeSingle();
      const { data: instRow } = await admin.from("User").select("name").eq("id", row.instructorId).maybeSingle();
      let roomLabel: string | null = null;
      if (roomIdApplied) {
        const { data: rm } = await admin.from("Room").select("code").eq("id", roomIdApplied).maybeSingle();
        roomLabel = (rm as { code?: string } | null)?.code ?? null;
      }
      const collegeIdForRow = (progRow as { collegeId?: string } | null)?.collegeId;
      const programIdForRow = (secRow as { programId?: string } | null)?.programId;
      if (collegeIdForRow && programIdForRow && secRow) {
        await notifyScheduleChangeApproved(admin, {
          collegeId: collegeIdForRow,
          programId: programIdForRow,
          sectionId: e.sectionId,
          instructorId: row.instructorId,
          instructorName: (instRow as { name?: string } | null)?.name ?? "Instructor",
          subjectCode: (subRow as { code?: string } | null)?.code ?? "Subject",
          sectionName: (secRow as { name?: string }).name ?? "Section",
          slotLabel,
          roomLabel,
          entryAfter: {
            sectionId: e.sectionId,
            subjectId: e.subjectId,
            academicPeriodId: e.academicPeriodId,
            day: row.requestedDay,
            startTime: row.requestedStartTime,
            endTime: row.requestedEndTime,
          },
        });
      } else {
        throw new Error("Missing section/program context for notifications");
      }
    } catch (err) {
      console.error("[schedule-change-requests] approve broadcast notifications failed", err);
      const notifBody =
        finalStatus === "approved_with_solution"
          ? `Approved (with solution). ${adminSuggestion ?? ""} Applied slot: ${slotLabel}.`
          : `Approved. Your class is now scheduled at ${slotLabel}.`;
      const { error: apprNotifErr } = await notifyInstructor(
        supabase,
        row.instructorId,
        "Schedule change request",
        notifBody,
      );
      if (apprNotifErr) {
        console.error("[schedule-change-requests] approve instructor fallback notification failed", apprNotifErr);
      }
    }
  } else {
    const notifBody =
      finalStatus === "approved_with_solution"
        ? `Approved (with solution). ${adminSuggestion ?? ""} Applied slot: ${slotLabel}.`
        : `Approved. Your class is now scheduled at ${slotLabel}.`;
    const { error: apprNotifErr } = await notifyInstructor(supabase, row.instructorId, "Schedule change request", notifBody);
    if (apprNotifErr) {
      console.error("[schedule-change-requests] approve notification insert failed", apprNotifErr);
    }
  }

  return NextResponse.json({ ok: true, status: finalStatus, severity, hits: hitsEnriched });
}

async function notifyInstructor(
  supabase: NonNullable<Awaited<ReturnType<typeof createSupabaseServerClient>>>,
  instructorId: string,
  title: string,
  message: string,
) {
  return supabase.from("Notification").insert({
    userId: instructorId,
    message: `${title}: ${message}`,
    isRead: false,
  });
}
