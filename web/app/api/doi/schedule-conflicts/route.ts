import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { fetchMyUserRowForAuth } from "@/lib/supabase/fetch-my-user-profile";
import { buildConflictScanPayload } from "@/lib/scheduling/conflict-scan-server";
import { Q } from "@/lib/supabase/catalog-columns";
import type { ScheduleEntry } from "@/types/db";
import { createSupabaseAdminClient, getSupabaseAdminConfigError } from "@/lib/supabase/admin";

/**
 * Campus-wide conflict scan for DOI: every ScheduleEntry in the term is checked for overlapping
 * faculty, section, and room usage (see scanAllScheduleConflicts / detectConflictsForEntry).
 */
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

  /**
   * RLS can hide rows outside the caller's scope and yield false "no conflicts".
   * Require service role for the timetable read (same as POST /api/scheduling/scope-conflict-scan).
   */
  const admin = createSupabaseAdminClient();
  if (!admin) {
    const detail = getSupabaseAdminConfigError();
    return NextResponse.json(
      {
        error:
          detail ??
          "Conflict scan requires SUPABASE_SERVICE_ROLE_KEY (to avoid RLS hiding schedule rows outside your role scope).",
      },
      { status: 503 },
    );
  }

  const { data: entries, error } = await admin
    .from("ScheduleEntry")
    .select(Q.scheduleEntry)
    .eq("academicPeriodId", periodId);
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  const entryList = (entries ?? []) as ScheduleEntry[];
  const { error: buildErr, payload } = await buildConflictScanPayload(admin, entryList);
  if (buildErr || !payload) {
    return NextResponse.json({ error: buildErr ?? "Conflict scan failed" }, { status: 400 });
  }

  return NextResponse.json({
    entryCount: payload.entryCount,
    conflictingEntryIds: payload.conflictingEntryIds,
    issueSummaries: payload.issueSummaries,
    issues: payload.issues,
    enrichedIssues: payload.enrichedIssues,
  });
}
