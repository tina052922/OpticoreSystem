/**
 * Shared server/client-safe helpers to run {@link scanAllSparseScheduleConflicts} plus label enrichment
 * (used by DOI API, dashboards, and any role-scoped conflict summaries).
 */
import type { SupabaseClient } from "@supabase/supabase-js";
import {
  enrichCampusConflictIssues,
  type EnrichedCampusIssue,
  buildConflictSummaryLines,
} from "@/lib/scheduling/conflict-enrichment";
import { scanAllSparseScheduleConflicts, scheduleEntryToSparseBlock } from "@/lib/scheduling/conflicts";
import { Q } from "@/lib/supabase/catalog-columns";
import type { College, Program, Room, ScheduleEntry, Section, Subject, User } from "@/types/db";

export type ConflictScanPayload = {
  entryCount: number;
  conflictingEntryIds: string[];
  issueSummaries: string[];
  issues: Array<{ entryId: string; type: string; message: string; relatedEntryId?: string }>;
  enrichedIssues: EnrichedCampusIssue[];
};

/**
 * Enrich conflict scan results with subject/section/room/faculty names (same shape as GET /api/doi/schedule-conflicts).
 */
export async function buildConflictScanPayload(
  supabase: SupabaseClient,
  entries: ScheduleEntry[],
): Promise<{ error: string | null; payload: ConflictScanPayload | null }> {
  const entryList = entries;
  const sparseBlocks = entryList
    .map((e) => scheduleEntryToSparseBlock(e))
    .filter((b): b is NonNullable<typeof b> => b != null);
  const scan = scanAllSparseScheduleConflicts(sparseBlocks);

  const subjectIds = [...new Set(entryList.map((e) => e.subjectId))];
  const sectionIds = [...new Set(entryList.map((e) => e.sectionId))];
  const roomIds = [...new Set(entryList.map((e) => e.roomId))];
  const userIds = [...new Set(entryList.map((e) => e.instructorId))];

  const [
    { data: subjectRows, error: es1 },
    { data: sectionRows, error: es2 },
    { data: roomRows, error: es3 },
    { data: userRows, error: es4 },
    { data: collegeRows, error: es5 },
  ] = await Promise.all([
    subjectIds.length
      ? supabase.from("Subject").select(Q.subject).in("id", subjectIds)
      : Promise.resolve({ data: [] as Subject[], error: null }),
    sectionIds.length
      ? supabase.from("Section").select(Q.section).in("id", sectionIds)
      : Promise.resolve({ data: [] as Section[], error: null }),
    roomIds.length
      ? supabase.from("Room").select(Q.room).in("id", roomIds)
      : Promise.resolve({ data: [] as Room[], error: null }),
    userIds.length
      ? supabase.from("User").select("id,email,name,role,collegeId,employeeId").in("id", userIds)
      : Promise.resolve({ data: [] as User[], error: null }),
    supabase.from("College").select(Q.college),
  ]);

  const lookupErr = es1 || es2 || es3 || es4 || es5;
  if (lookupErr) {
    return { error: lookupErr.message, payload: null };
  }

  const subjectById = new Map<string, Subject>((subjectRows ?? []).map((s) => [s.id, s]));
  const sectionById = new Map<string, Section>((sectionRows ?? []).map((s) => [s.id, s]));
  const roomById = new Map<string, Room>((roomRows ?? []).map((r) => [r.id, r]));
  const userById = new Map<string, User>((userRows ?? []).map((u) => [u.id, u as User]));
  const programById = new Map<string, Program>();
  const programIds = [...new Set([...sectionById.values()].map((s) => s.programId))];
  if (programIds.length > 0) {
    const { data: programs, error: ep } = await supabase.from("Program").select(Q.program).in("id", programIds);
    if (ep) return { error: ep.message, payload: null };
    (programs ?? []).forEach((p) => programById.set(p.id, p as Program));
  }

  const collegeNameById = new Map<string, string>((collegeRows as College[] | null)?.map((c) => [c.id, c.name]) ?? []);

  const entryById = new Map(entryList.map((e) => [e.id, e]));
  const enrichedIssues = enrichCampusConflictIssues(
    scan.issues,
    entryById,
    subjectById,
    sectionById,
    roomById,
    userById,
    programById,
    collegeNameById,
  );

  const summaries = enrichedIssues.length > 0 ? buildConflictSummaryLines(enrichedIssues, 14) : scan.issueSummaries;

  return {
    error: null,
    payload: {
      entryCount: sparseBlocks.length,
      conflictingEntryIds: [...scan.conflictingEntryIds],
      issueSummaries: summaries,
      issues: scan.issues,
      enrichedIssues,
    },
  };
}
