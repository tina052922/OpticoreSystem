/**
 * Live schedule conflict detection for Campus Intelligence dashboards (Program Chairman, College Admin, GEC Chairman).
 * Uses the same overlap rules as the Evaluator full conflict check; not tied to calendar “today” — reflects current master data.
 */
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { buildConflictScanPayload } from "@/lib/scheduling/conflict-scan-server";
import { getCurrentAcademicPeriod } from "@/lib/server/dashboard-data";
import { Q } from "@/lib/supabase/catalog-columns";
import { CAMPUS_WIDE_COLLEGE_SLUG, hubSlugForCollegeId } from "@/lib/evaluator-central-hub";
import type { Program, ScheduleEntry, Section } from "@/types/db";

export type DashboardConflictBanner = {
  /** Distinct schedule rows involved in at least one overlap */
  conflictingRowCount: number;
  /** Human-readable lines for the card (enriched root causes) */
  previewLines: string[];
  /** Deep link into the role’s Evaluator with query flags for highlighting */
  evaluatorHref: string;
  firstFocusEntryId: string | null;
};

function formatHref(base: string, q: Record<string, string>): string {
  const u = new URLSearchParams(q);
  return `${base}?${u.toString()}`;
}

/**
 * Returns a banner payload when the current term has at least one resource conflict in scope; otherwise null.
 */
export async function getDashboardConflictBanner(opts: {
  mode: "chairman_program" | "college" | "gec_campus" | "doi_campus";
  collegeId: string | null;
  programId: string | null;
}): Promise<DashboardConflictBanner | null> {
  const supabase = await createSupabaseServerClient();
  if (!supabase) return null;

  const period = await getCurrentAcademicPeriod();
  if (!period) return null;

  const { data: rawEntries, error } = await supabase
    .from("ScheduleEntry")
    .select(Q.scheduleEntry)
    .eq("academicPeriodId", period.id);
  if (error || !rawEntries?.length) return null;

  let entries = rawEntries as ScheduleEntry[];

  if (opts.mode === "gec_campus" || opts.mode === "doi_campus") {
    /* Full campus timetable — DOI / GEC campus views. */
  } else {
    const { data: sections } = await supabase.from("Section").select(Q.section);
    const { data: programs } = await supabase.from("Program").select(Q.program);
    const sectionById = new Map<string, Section>((sections as Section[] | null)?.map((s) => [s.id, s]) ?? []);
    const programById = new Map<string, Program>((programs as Program[] | null)?.map((p) => [p.id, p]) ?? []);

    entries = entries.filter((e) => {
      const sec = sectionById.get(e.sectionId);
      if (!sec) return false;
      const pr = programById.get(sec.programId);
      if (!pr) return false;
      if (opts.mode === "chairman_program") {
        if (opts.programId) return sec.programId === opts.programId;
        if (opts.collegeId) return pr.collegeId === opts.collegeId;
        return false;
      }
      if (!opts.collegeId) return false;
      return pr.collegeId === opts.collegeId;
    });
  }

  if (entries.length === 0) return null;

  const { payload, error: buildErr } = await buildConflictScanPayload(supabase, entries);
  if (buildErr || !payload) return null;

  const n = payload.conflictingEntryIds.length;
  if (n === 0) return null;

  const previewLines = payload.enrichedIssues.slice(0, 4).map((iss) => iss.rootCause);
  const firstId = payload.conflictingEntryIds[0] ?? null;

  let evaluatorHref: string;
  if (opts.mode === "chairman_program") {
    evaluatorHref = formatHref("/chairman/evaluator", {
      conflicts: "1",
      ...(firstId ? { focusEntry: firstId } : {}),
    });
  } else if (opts.mode === "gec_campus") {
    evaluatorHref = formatHref("/admin/gec/evaluator", {
      conflicts: "1",
      ...(firstId ? { focusEntry: firstId } : {}),
    });
  } else if (opts.mode === "doi_campus") {
    evaluatorHref = formatHref("/doi/evaluator", {
      college: CAMPUS_WIDE_COLLEGE_SLUG,
      conflicts: "1",
      ...(firstId ? { focusEntry: firstId } : {}),
    });
  } else {
    const slug = opts.collegeId ? hubSlugForCollegeId(opts.collegeId) ?? CAMPUS_WIDE_COLLEGE_SLUG : CAMPUS_WIDE_COLLEGE_SLUG;
    evaluatorHref = formatHref("/admin/college/evaluator", {
      college: slug,
      conflicts: "1",
      ...(firstId ? { focusEntry: firstId } : {}),
    });
  }

  return {
    conflictingRowCount: n,
    previewLines,
    evaluatorHref,
    firstFocusEntryId: firstId,
  };
}
