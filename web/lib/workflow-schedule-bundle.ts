import { BSIT_EVALUATOR_TIME_SLOTS } from "@/lib/chairman/bsit-evaluator-constants";
import {
  normalizeProspectusCode,
  prospectusByCode,
  scheduleDurationSlots,
} from "@/lib/chairman/bsit-prospectus";
import type { EvaluatorSessionSnapshotV1 } from "@/lib/opticore-evaluator-session-sync";
import { readEvaluatorSessionSnapshot } from "@/lib/opticore-evaluator-session-sync";
import type { ScheduleEntry } from "@/types/db";

export const WORKFLOW_SCHEDULE_BUNDLE_VERSION = 1 as const;
export const CENTRAL_HUB_PENDING_BUNDLE_KEY = "opticore-central-hub-pending-bundle-v1";

export const WORKFLOW_BUNDLE_KIND = "opticore_workflow_schedule_bundle" as const;

export type InsShareView = "faculty" | "section" | "room";

/** Canonical handoff: one JSON blob links INS views and Evaluator drafts via shared ScheduleEntry rows. */
export type WorkflowScheduleBundleV1 = {
  kind: typeof WORKFLOW_BUNDLE_KIND;
  version: typeof WORKFLOW_SCHEDULE_BUNDLE_VERSION;
  createdAt: string;
  academicPeriodId: string;
  collegeId: string;
  programId: string | null;
  programCode?: string | null;
  collegeName?: string | null;
  /** Which INS surface triggered share (all three forms derive from `scheduleEntries`). */
  insShareView: InsShareView;
  insContext?: {
    selectedFacultyId?: string;
    selectedSectionId?: string;
    selectedRoomId?: string;
  };
  /** Merged DB-scoped rows + any complete BSIT worksheet rows (same ids as ScheduleEntry when synced). */
  scheduleEntries: ScheduleEntry[];
  /** Raw BSIT worksheet rows for audit / replay if entry conversion differs. */
  evaluatorPlotRows?: EvaluatorSessionSnapshotV1["rows"];
};

export function isWorkflowScheduleBundleV1(v: unknown): v is WorkflowScheduleBundleV1 {
  if (!v || typeof v !== "object") return false;
  const o = v as Record<string, unknown>;
  return (
    o.kind === WORKFLOW_BUNDLE_KIND &&
    o.version === WORKFLOW_SCHEDULE_BUNDLE_VERSION &&
    typeof o.academicPeriodId === "string" &&
    typeof o.collegeId === "string" &&
    typeof o.insShareView === "string" &&
    Array.isArray(o.scheduleEntries)
  );
}

function rowTimeBounds(row: EvaluatorSessionSnapshotV1["rows"][number]): {
  start: (typeof BSIT_EVALUATOR_TIME_SLOTS)[0];
  endSlot: (typeof BSIT_EVALUATOR_TIME_SLOTS)[0];
} | null {
  const p = row.subjectCode ? prospectusByCode(row.subjectCode) : undefined;
  if (!p) return null;
  const dur = scheduleDurationSlots(p);
  const maxS = BSIT_EVALUATOR_TIME_SLOTS.length - dur;
  const startIdx = Math.min(row.startSlotIndex, maxS);
  const start = BSIT_EVALUATOR_TIME_SLOTS[startIdx];
  const endIdx = startIdx + dur - 1;
  const endSlot = BSIT_EVALUATOR_TIME_SLOTS[endIdx];
  if (!start || !endSlot || startIdx < 0 || endIdx >= BSIT_EVALUATOR_TIME_SLOTS.length) return null;
  return { start, endSlot };
}

/**
 * Converts BSIT worksheet rows to ScheduleEntry-shaped rows (status draft) for bundling.
 * `subjectIdByCode` maps normalized prospectus code → Subject.id from DB.
 */
export function plotRowsToScheduleEntries(args: {
  rows: EvaluatorSessionSnapshotV1["rows"];
  academicPeriodId: string;
  subjectIdByCode: Map<string, string>;
}): ScheduleEntry[] {
  const out: ScheduleEntry[] = [];
  for (const row of args.rows) {
    if (!row.sectionId || !row.instructorId || !row.roomId || !row.subjectCode) continue;
    const subjectId = args.subjectIdByCode.get(normalizeProspectusCode(row.subjectCode));
    if (!subjectId) continue;
    const t = rowTimeBounds(row);
    if (!t) continue;
    out.push({
      id: row.id,
      academicPeriodId: args.academicPeriodId,
      subjectId,
      instructorId: row.instructorId,
      sectionId: row.sectionId,
      roomId: row.roomId,
      day: row.day,
      startTime: t.start.startTime,
      endTime: t.endSlot.endTime,
      status: "draft",
    });
  }
  return out;
}

function mergeScheduleEntriesById(base: ScheduleEntry[], overlay: ScheduleEntry[]): ScheduleEntry[] {
  const m = new Map<string, ScheduleEntry>();
  for (const e of base) m.set(e.id, e);
  for (const e of overlay) m.set(e.id, e);
  return Array.from(m.values());
}

export type BuildWorkflowBundleArgs = {
  academicPeriodId: string;
  collegeId: string;
  programId: string | null;
  programCode?: string | null;
  collegeName?: string | null;
  insShareView: InsShareView;
  /** Scoped term rows from INS catalog (ScheduleEntry). */
  termScopedEntries: ScheduleEntry[];
  insContext?: WorkflowScheduleBundleV1["insContext"];
  /** Map normalized subject code → Subject.id (Chairman program subjects). */
  subjectIdByCode: Map<string, string>;
};

export function buildWorkflowScheduleBundle(args: BuildWorkflowBundleArgs): WorkflowScheduleBundleV1 {
  const snap = readEvaluatorSessionSnapshot();
  const plotRows =
    snap &&
    snap.academicPeriodId === args.academicPeriodId &&
    (snap.collegeId == null || snap.collegeId === args.collegeId) &&
    (snap.programId == null || snap.programId === args.programId)
      ? snap.rows
      : undefined;

  const fromPlots =
    plotRows && plotRows.length > 0
      ? plotRowsToScheduleEntries({
          rows: plotRows,
          academicPeriodId: args.academicPeriodId,
          subjectIdByCode: args.subjectIdByCode,
        })
      : [];

  const merged = mergeScheduleEntriesById(args.termScopedEntries, fromPlots);

  return {
    kind: WORKFLOW_BUNDLE_KIND,
    version: WORKFLOW_SCHEDULE_BUNDLE_VERSION,
    createdAt: new Date().toISOString(),
    academicPeriodId: args.academicPeriodId,
    collegeId: args.collegeId,
    programId: args.programId,
    programCode: args.programCode ?? undefined,
    collegeName: args.collegeName ?? undefined,
    insShareView: args.insShareView,
    insContext: args.insContext,
    scheduleEntries: merged,
    evaluatorPlotRows: plotRows,
  };
}

export function storePendingCentralHubBundle(bundle: WorkflowScheduleBundleV1) {
  if (typeof window === "undefined") return;
  try {
    sessionStorage.setItem(CENTRAL_HUB_PENDING_BUNDLE_KEY, JSON.stringify(bundle));
  } catch {
    /* ignore */
  }
}

export function readPendingCentralHubBundle(): WorkflowScheduleBundleV1 | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = sessionStorage.getItem(CENTRAL_HUB_PENDING_BUNDLE_KEY);
    if (!raw) return null;
    const v = JSON.parse(raw) as unknown;
    return isWorkflowScheduleBundleV1(v) ? v : null;
  } catch {
    return null;
  }
}

export function clearPendingCentralHubBundle() {
  if (typeof window === "undefined") return;
  try {
    sessionStorage.removeItem(CENTRAL_HUB_PENDING_BUNDLE_KEY);
  } catch {
    /* ignore */
  }
}
