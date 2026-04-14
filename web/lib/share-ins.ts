import { normalizeProspectusCode } from "@/lib/chairman/bsit-prospectus";
import { createSupabaseBrowserClient } from "@/lib/supabase/browser";
import {
  buildWorkflowScheduleBundle,
  type InsShareView,
  type WorkflowScheduleBundleV1,
} from "@/lib/workflow-schedule-bundle";
import { defaultAcademicPeriodId, Q } from "@/lib/supabase/catalog-columns";
import type { AcademicPeriod, ScheduleEntry, Subject } from "@/types/db";

const VIEW_LABEL: Record<InsShareView, string> = {
  faculty: "INS 5A (Faculty)",
  section: "INS 5B (Section)",
  room: "INS 5C (Room)",
};

/** Text-only share (e.g. campus-wide DOI) — no structured bundle. */
export async function shareInsView(view: InsShareView) {
  const res = await fetch("/api/inbox/share", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      subject: `INS Form shared – ${VIEW_LABEL[view]}`,
      body: `This is a simulated share to College Admin for ${VIEW_LABEL[view]}.`,
      view,
    }),
  });

  if (!res.ok) {
    const data = (await res.json().catch(() => null)) as { error?: string } | null;
    throw new Error(data?.error || "Failed to share");
  }
}

/** Chairman INS share: persists workflow bundle (INS-scoped rows + linked Evaluator worksheet snapshot). */
export async function shareInsWorkflowBundle(bundle: WorkflowScheduleBundleV1) {
  const res = await fetch("/api/inbox/share", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      subject: `INS Form shared – ${VIEW_LABEL[bundle.insShareView]} (Evaluator linked)`,
      body:
        `Workflow handoff: ${bundle.scheduleEntries.length} schedule row(s) for the current academic period. ` +
        `INS Form 5A/5B/5C views and the Chairman Evaluator use the same ScheduleEntry-linked data. ` +
        `College Admin can download the JSON bundle and open Central Hub Evaluator to load and organize by college and program.`,
      view: bundle.insShareView,
      payload: bundle,
    }),
  });

  if (!res.ok) {
    const data = (await res.json().catch(() => null)) as { error?: string } | null;
    throw new Error(data?.error || "Failed to share");
  }
}

/**
 * Builds the same bundle shape as INS share, for Chairman Inbox “Forward to College Admin”
 * without opening an INS page.
 */
export async function buildChairmanInboxForwardBundle(args: {
  collegeId: string;
  programId: string | null;
  programCode?: string | null;
}): Promise<WorkflowScheduleBundleV1 | null> {
  const supabase = createSupabaseBrowserClient();
  if (!supabase) return null;

  const { data: apRows, error: e1 } = await supabase
    .from("AcademicPeriod")
    .select(Q.academicPeriod)
    .order("startDate", { ascending: false });
  if (e1 || !apRows?.length) return null;

  const periods = apRows as AcademicPeriod[];
  const curId = defaultAcademicPeriodId(periods);
  if (!curId) return null;

  const { data: secRows, error: e2 } = await supabase.from("Section").select("id, programId");
  if (e2) return null;

  const sectionIds = new Set(
    (secRows ?? []).filter((s) => !args.programId || s.programId === args.programId).map((s) => s.id),
  );

  const { data: schRows, error: e3 } = await supabase
    .from("ScheduleEntry")
    .select(Q.scheduleEntry)
    .eq("academicPeriodId", curId);
  if (e3) return null;

  const termScoped = ((schRows ?? []) as ScheduleEntry[]).filter((e) => sectionIds.has(e.sectionId));

  const { data: subRows, error: e4 } = await supabase.from("Subject").select("id, code, programId");
  if (e4) return null;

  const subjectIdByCode = new Map<string, string>();
  for (const s of (subRows ?? []) as Subject[]) {
    if (args.programId && s.programId !== args.programId) continue;
    subjectIdByCode.set(normalizeProspectusCode(s.code), s.id);
  }

  return buildWorkflowScheduleBundle({
    academicPeriodId: curId,
    collegeId: args.collegeId,
    programId: args.programId,
    programCode: args.programCode ?? null,
    insShareView: "faculty",
    termScopedEntries: termScoped,
    subjectIdByCode,
    insContext: {},
  });
}
