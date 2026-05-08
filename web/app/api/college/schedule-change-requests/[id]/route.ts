import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { createSupabaseAdminClient, getSupabaseAdminConfigError } from "@/lib/supabase/admin";
import { fetchMyUserRowForAuth } from "@/lib/supabase/fetch-my-user-profile";
import { notifyScheduleChangeApproved } from "@/lib/server/notify-schedule-change-approved";
import { checkConflictForProposedMove } from "@/lib/schedule-change/conflict-check";
import { buildScheduleChangeAlternatives } from "@/lib/schedule-change/schedule-change-alternatives";
import { Q } from "@/lib/supabase/catalog-columns";
import { enrichConflictHitsForDisplay } from "@/lib/schedule-change/enrich-conflict-hits";
import { getRoomsForCollege, getScheduleEntriesForAcademicPeriod } from "@/lib/server/schedule-change-queries";
import type { ScheduleChangeStatus } from "@/types/db";
import type { ScheduleEntry } from "@/types/db";

type Ctx = { params: Promise<{ id: string }> };

type PatchBody = {
  action?: "approve" | "reject" | "approve_with_solution";
  adminSuggestion?: string | null;
  /** Deprecated: ignored (alternatives are never auto-applied). */
  applySuggestedMitigation?: boolean;
  /** What to write to `ScheduleEntry`: instructor’s request, or a campus-built alternative by index. */
  approveSolution?:
    | { kind: "instructor_request" }
    | { kind: "alternative"; index: number }
    | undefined;
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
  const actionRaw = body?.action;
  /** `approve_with_solution` kept for backwards compatibility → same as approve (no automatic mitigation). */
  const action =
    actionRaw === "approve_with_solution" ? "approve" : actionRaw;
  const adminSuggestion = body?.adminSuggestion?.trim() || null;

  if (action !== "approve" && action !== "reject") {
    return NextResponse.json({ error: "action must be approve or reject" }, { status: 400 });
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

  const rawSol = body?.approveSolution;
  let parsedApproveSolution: { kind: "instructor_request" } | { kind: "alternative"; index: number };
  if (rawSol == null) {
    parsedApproveSolution = { kind: "instructor_request" };
  } else if (typeof rawSol === "object") {
    const k = (rawSol as { kind?: unknown }).kind;
    if (k === "instructor_request") {
      parsedApproveSolution = { kind: "instructor_request" };
    } else if (k === "alternative") {
      const idx = (rawSol as { index?: unknown }).index;
      if (typeof idx !== "number" || !Number.isInteger(idx)) {
        return NextResponse.json(
          { error: "approveSolution.alternative requires integer index" },
          { status: 400 },
        );
      }
      parsedApproveSolution = { kind: "alternative", index: idx };
    } else {
      return NextResponse.json(
        { error: "approveSolution.kind must be instructor_request or alternative" },
        { status: 400 },
      );
    }
  } else {
    return NextResponse.json({ error: "approveSolution must be an object or omitted" }, { status: 400 });
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
  const allCampusReader = createSupabaseAdminClient();
  if (!allCampusReader) {
    const detail = getSupabaseAdminConfigError();
    return NextResponse.json(
      {
        error:
          detail ??
          "Approval conflict verification requires SUPABASE_SERVICE_ROLE_KEY for a full campus scan.",
      },
      { status: 503 },
    );
  }
  const allCampus = await getScheduleEntriesForAcademicPeriod(allCampusReader, e.academicPeriodId);
  const rooms = await getRoomsForCollege(supabase, profile.collegeId);

  const alternatives = buildScheduleChangeAlternatives(
    e,
    row.requestedDay,
    row.requestedStartTime,
    row.requestedEndTime,
    allCampus,
    rooms,
  );

  let appliedDay: string;
  let appliedStart: string;
  let appliedEnd: string;
  let appliedRoomId: string;

  const sol = parsedApproveSolution;
  if (sol.kind === "instructor_request") {
    appliedDay = row.requestedDay;
    appliedStart = row.requestedStartTime;
    appliedEnd = row.requestedEndTime;
    appliedRoomId = e.roomId;
  } else {
    const idx = sol.index;
    if (!Number.isInteger(idx) || idx < 0 || idx >= alternatives.length) {
      return NextResponse.json(
        {
          error:
            "Invalid alternative index. Run the conflict checker again, choose a listed solution, or approve the instructor’s requested slot.",
        },
        { status: 400 },
      );
    }
    const alt = alternatives[idx]!;
    appliedDay = alt.day;
    appliedStart = alt.startTime;
    appliedEnd = alt.endTime;
    appliedRoomId = alt.roomId ?? e.roomId;
  }

  const roomOverrideForCheck =
    appliedRoomId !== e.roomId ? appliedRoomId : null;

  const { severity, hits } = checkConflictForProposedMove(
    e,
    appliedDay,
    appliedStart,
    appliedEnd,
    allCampus,
    roomOverrideForCheck,
  );

  const hitsEnriched = await enrichConflictHitsForDisplay(supabase, hits, allCampus);

  if (severity !== "none") {
    return NextResponse.json(
      {
        error:
          "Timetable conflicts remain for this slot (campus-wide). Choose a conflict-free alternative or clear overlaps on the master schedule before approving.",
        severity,
        hits: hitsEnriched,
      },
      { status: 409 },
    );
  }

  /** Approve persists the chosen slot (instructor request or admin-selected alternative). */
  const finalStatus: ScheduleChangeStatus = "approved";

  const entryUpdate: {
    day: string;
    startTime: string;
    endTime: string;
    status: "draft";
    roomId?: string;
  } = {
    day: appliedDay,
    startTime: appliedStart,
    endTime: appliedEnd,
    status: "draft",
  };
  if (appliedRoomId !== e.roomId) {
    entryUpdate.roomId = appliedRoomId;
  }

  const { error: updEntryErr } = await supabase
    .from("ScheduleEntry")
    .update(entryUpdate)
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

  const slotLabel = `${appliedDay} ${appliedStart}–${appliedEnd}`;
  const roomIdApplied = appliedRoomId;

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
            day: appliedDay,
            startTime: appliedStart,
            endTime: appliedEnd,
          },
        });
      } else {
        throw new Error("Missing section/program context for notifications");
      }
    } catch (err) {
      console.error("[schedule-change-requests] approve broadcast notifications failed", err);
      const notifBody = adminSuggestion
        ? `Approved. College Admin note: ${adminSuggestion} Your class is now at ${slotLabel}.`
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
    const notifBody = adminSuggestion
      ? `Approved. College Admin note: ${adminSuggestion} Your class is now at ${slotLabel}.`
      : `Approved. Your class is now scheduled at ${slotLabel}.`;
    const { error: apprNotifErr } = await notifyInstructor(supabase, row.instructorId, "Schedule change request", notifBody);
    if (apprNotifErr) {
      console.error("[schedule-change-requests] approve notification insert failed", apprNotifErr);
    }
  }

  return NextResponse.json({
    ok: true,
    status: finalStatus,
    severity,
    hits: hitsEnriched,
    academicPeriodId: e.academicPeriodId,
    applied: { day: appliedDay, startTime: appliedStart, endTime: appliedEnd, roomId: appliedRoomId },
  });
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
