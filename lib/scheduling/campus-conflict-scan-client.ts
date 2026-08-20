import {
  scanAllSparseScheduleConflicts,
  scheduleEntryToSparseBlock,
  type SparseScheduleBlock,
} from "@/lib/scheduling/conflicts";
import { schedulingApi } from "@/lib/api/client";
import type { ScheduleEntry } from "@/types/db";

export type CampusConflictScanResult = {
  conflictingEntryIds: Set<string>;
  issueSummaries: string[];
  issues: { entryId: string; type: string; message: string; relatedEntryId?: string }[];
  apiOk: boolean;
  apiError?: string;
};

function issueEdgeKey(i: { entryId: string; type: string; relatedEntryId?: string }) {
  if (!i.relatedEntryId) return `${i.type}:${i.entryId}`;
  const [a, b] = [i.entryId, i.relatedEntryId].sort();
  return `${i.type}:${a}:${b}`;
}

/** Client-side sparse scan from full term rows (includes partial rows — not only “complete” plot blocks). */
export function localCampusConflictScanFromEntries(entries: ScheduleEntry[]): ReturnType<typeof scanAllSparseScheduleConflicts> {
  const blocks = entries
    .map((e) => scheduleEntryToSparseBlock(e))
    .filter((b): b is SparseScheduleBlock => b != null);
  return scanAllSparseScheduleConflicts(blocks);
}

export function localCampusConflictScanFromSparse(blocks: SparseScheduleBlock[]) {
  return scanAllSparseScheduleConflicts(blocks);
}

/**
 * Campus-wide conflict scan: local (all visible rows) merged with admin API when available.
 */
export async function runCampusConflictScan(args: {
  academicPeriodId: string;
  localEntries: ScheduleEntry[];
  localSparseBlocks?: SparseScheduleBlock[];
  apiMode?: "doi_campus" | "gec_campus" | "chairman_program" | "college";
  collegeId?: string | null;
  programId?: string | null;
}): Promise<CampusConflictScanResult> {
  const localScan = args.localSparseBlocks
    ? localCampusConflictScanFromSparse(args.localSparseBlocks)
    : localCampusConflictScanFromEntries(
        args.localEntries.filter((e) => e.academicPeriodId === args.academicPeriodId),
      );

  const issueMap = new Map<string, (typeof localScan.issues)[0]>();
  for (const i of localScan.issues) issueMap.set(issueEdgeKey(i), i);

  const ids = new Set<string>(localScan.conflictingEntryIds);

  let apiOk = false;
  let apiError: string | undefined;

  try {
    const api = await schedulingApi.scopeConflictScan({
      academicPeriodId: args.academicPeriodId,
      mode: args.apiMode ?? "doi_campus",
      collegeId: args.collegeId ?? null,
      programId: args.programId ?? null,
    });
    apiOk = true;
    for (const id of api.conflictingEntryIds ?? []) ids.add(id);
    for (const i of api.issues ?? []) issueMap.set(issueEdgeKey(i), i);
  } catch (e) {
    apiError = e instanceof Error ? e.message : "Network error";
  }

  const mergedIssues = [...issueMap.values()];
  const issueSummaries = [...new Set(mergedIssues.map((i) => i.message))];

  return {
    conflictingEntryIds: ids,
    issueSummaries,
    issues: mergedIssues,
    apiOk,
    apiError,
  };
}
