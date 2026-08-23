import { normalizeProspectusCode } from "@/lib/chairman/bsit-prospectus";
import { inboxApi, semestersApi, apiFetch, catalogApi, API_CACHE_TTL } from "@/lib/api/client";
import {
  buildWorkflowScheduleBundle,
  type InsShareView,
  type WorkflowScheduleBundleV1,
} from "@/lib/workflow-schedule-bundle";
import type { AcademicPeriod, ScheduleEntry, Subject } from "@/types/db";

function defaultAcademicPeriodId(list: AcademicPeriod[]): string {
  const cur = list.find((p) => p.isCurrent);
  return cur?.id ?? list[0]?.id ?? "";
}

const VIEW_LABEL: Record<InsShareView, string> = {
  faculty: "INS 5A (Faculty)",
  section: "INS 5B (Section)",
  room: "INS 5C (Room)",
};

/** Text-only share (e.g. campus-wide DOI) — no structured bundle. */
export async function shareInsView(view: InsShareView) {
  await inboxApi.share({
    subject: `INS Form shared – ${VIEW_LABEL[view]}`,
    body: `This is a simulated share to College Admin for ${VIEW_LABEL[view]}.`,
    view,
  });
}

/** Chairman INS share: persists workflow bundle (INS-scoped rows + linked Evaluator worksheet snapshot). */
export async function shareInsWorkflowBundle(bundle: WorkflowScheduleBundleV1) {
  await inboxApi.share({
    subject: `INS Form shared – ${VIEW_LABEL[bundle.insShareView]} (Evaluator linked)`,
    body:
      `Workflow handoff: ${bundle.scheduleEntries.length} schedule row(s) for the current academic period. ` +
      `INS Form 5A/5B/5C views and the Chairman Evaluator use the same ScheduleEntry-linked data. ` +
      `College Admin can download the JSON bundle and open Central Hub Evaluator to load and organize by college and program.`,
    view: bundle.insShareView,
    payload: bundle,
  });
}

/**
 * Builds the same bundle shape as INS share, for Chairman Inbox "Forward to College Admin"
 * without opening an INS page.
 */
export async function buildChairmanInboxForwardBundle(args: {
  collegeId: string;
  programId: string | null;
  programCode?: string | null;
}): Promise<WorkflowScheduleBundleV1 | null> {
  let curId: string | null = null;
  try {
    const { semesters } = await semestersApi.list();
    curId = defaultAcademicPeriodId(semesters as AcademicPeriod[]);
  } catch {
    return null;
  }
  if (!curId) return null;

  try {
    const [secRes, schRes, subRes] = await Promise.all([
      catalogApi.sections(),
      catalogApi.scheduleEntries<{ entries: ScheduleEntry[] }>(curId),
      apiFetch<{ subjects: Subject[] }>("/api/catalog/subjects", {
        method: "GET",
        cacheTtlMs: API_CACHE_TTL.CATALOG_STATIC,
      }),
    ]);

    const sectionIds = new Set(
      (secRes.sections ?? []).filter((s) => !args.programId || s.programId === args.programId).map((s) => s.id),
    );

    const termScoped = (schRes.entries ?? []).filter((e) => sectionIds.has(e.sectionId));

    const subjectIdByCode = new Map<string, string>();
    for (const s of subRes.subjects ?? []) {
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
  } catch {
    return null;
  }
}
