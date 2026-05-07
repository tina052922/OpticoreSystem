import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { fetchMyUserRowForAuth } from "@/lib/supabase/fetch-my-user-profile";
import { buildConflictScanPayload } from "@/lib/scheduling/conflict-scan-server";
import { Q } from "@/lib/supabase/catalog-columns";
import type { Program, ScheduleEntry, Section } from "@/types/db";
import { createSupabaseAdminClient, getSupabaseAdminConfigError } from "@/lib/supabase/admin";

const ALLOWED_ROLES = new Set([
  "chairman_admin",
  "college_admin",
  "cas_admin",
  "gec_chairman",
  "doi_admin",
]);

type Body = {
  academicPeriodId?: string;
  mode?: "chairman_program" | "college" | "gec_campus" | "doi_campus";
  collegeId?: string | null;
  programId?: string | null;
};

/**
 * Enriched campus-wide (or scoped) conflict scan for Evaluator UIs — same payload as DOI schedule-conflicts,
 * with entry filtering aligned to {@link getDashboardConflictBanner}.
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
  if (!profile || !ALLOWED_ROLES.has(profile.role)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  let body: Body;
  try {
    body = (await req.json()) as Body;
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const periodId = body.academicPeriodId?.trim();
  if (!periodId) {
    return NextResponse.json({ error: "academicPeriodId is required" }, { status: 400 });
  }

  const mode = body.mode ?? "gec_campus";

  /**
   * IMPORTANT: for all admin conflict scans, RLS may hide rows and cause false "no conflicts".
   * Require the service-role client when configured; otherwise return 503 rather than a misleading scan.
   */
  const admin = createSupabaseAdminClient();
  const reader = admin ?? supabase;
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

  const { data: rawEntries, error } = await reader
    .from("ScheduleEntry")
    .select(Q.scheduleEntry)
    .eq("academicPeriodId", periodId);
  if (error) return NextResponse.json({ error: error.message }, { status: 400 });

  let entries = (rawEntries ?? []) as ScheduleEntry[];

  if (mode === "gec_campus" || mode === "doi_campus") {
    /* full timetable */
  } else {
    const { data: sections, error: secErr } = await reader.from("Section").select(Q.section);
    const { data: programs, error: progErr } = await reader.from("Program").select(Q.program);
    if (secErr || progErr) {
      return NextResponse.json({ error: (secErr ?? progErr)!.message }, { status: 400 });
    }
    const sectionById = new Map<string, Section>((sections as Section[] | null)?.map((s) => [s.id, s]) ?? []);
    const programById = new Map<string, Program>((programs as Program[] | null)?.map((p) => [p.id, p]) ?? []);

    entries = entries.filter((e) => {
      const sec = sectionById.get(e.sectionId);
      if (!sec) return false;
      const pr = programById.get(sec.programId);
      if (!pr) return false;
      if (mode === "chairman_program") {
        if (body.programId) return sec.programId === body.programId;
        if (body.collegeId) return pr.collegeId === body.collegeId;
        return false;
      }
      if (!body.collegeId) return false;
      return pr.collegeId === body.collegeId;
    });
  }

  const { error: buildErr, payload } = await buildConflictScanPayload(reader, entries);
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
