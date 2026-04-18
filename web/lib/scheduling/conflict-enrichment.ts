import { formatTimeRange } from "@/lib/evaluator/schedule-evaluator-table";
import type { ScheduleEntry, Subject, Section, Room, User, Program } from "@/types/db";

export type ConflictRowSnapshot = {
  entryId: string;
  what: string;
  when: string;
  where: string;
  who: string;
  collegeName: string;
};

export type EnrichedCampusIssue = {
  /** Stable key for list rendering */
  key: string;
  type: "faculty" | "section" | "room";
  rootCause: string;
  rowA: ConflictRowSnapshot;
  rowB: ConflictRowSnapshot;
};

/** Counts by conflict dimension for dashboard chips (pairwise issues). */
export function summarizeConflictIssueTypes(issues: EnrichedCampusIssue[]): {
  total: number;
  faculty: number;
  room: number;
  section: number;
} {
  let faculty = 0;
  let room = 0;
  let section = 0;
  for (const i of issues) {
    if (i.type === "faculty") faculty += 1;
    else if (i.type === "room") room += 1;
    else section += 1;
  }
  return { total: issues.length, faculty, room, section };
}

/** One-line title for compact lists (panel headline). */
export function conflictHeadlineShort(iss: EnrichedCampusIssue): string {
  const secA = iss.rowA.what.includes("·") ? iss.rowA.what.split("·")[1]?.trim() ?? "" : "";
  switch (iss.type) {
    case "faculty":
      return `Faculty double-booking: ${iss.rowA.who} at ${iss.rowA.when}`;
    case "room":
      return `Room ${iss.rowA.where} occupied: ${iss.rowA.when}`;
    case "section":
      return `Section ${secA || "overlap"}: two classes at ${iss.rowA.when}`;
    default:
      return iss.rootCause.slice(0, 140);
  }
}

export function parseSnapshotSubjectSection(what: string): { subject: string; section: string } {
  const parts = what.split("·").map((s) => s.trim());
  return { subject: parts[0] ?? "—", section: parts[1] ?? "—" };
}

/** JSON shape returned by GET /api/doi/schedule-conflicts */
export type CampusConflictScanApiPayload = {
  entryCount: number;
  conflictingEntryIds: string[];
  issueSummaries: string[];
  issues: Array<{ entryId: string; type: string; message: string; relatedEntryId?: string }>;
  enrichedIssues: EnrichedCampusIssue[];
};

type RawIssue = { entryId: string; type: string; message: string; relatedEntryId?: string };

function snapshotEntry(
  e: ScheduleEntry,
  subjectById: Map<string, Subject>,
  sectionById: Map<string, Section>,
  roomById: Map<string, Room>,
  userById: Map<string, User>,
  programById: Map<string, Program>,
  collegeNameById: Map<string, string>,
): ConflictRowSnapshot {
  const sec = sectionById.get(e.sectionId);
  const sub = subjectById.get(e.subjectId);
  const room = roomById.get(e.roomId);
  const inst = userById.get(e.instructorId);
  const pr = sec ? programById.get(sec.programId) : undefined;
  const collegeName = pr ? collegeNameById.get(pr.collegeId) ?? "" : "";
  return {
    entryId: e.id,
    what: `${sub?.code ?? "—"} · ${sec?.name ?? "—"}`,
    when: `${e.day} ${formatTimeRange(e.startTime, e.endTime)}`,
    where: room?.code ?? "TBA",
    who: inst?.name ?? "—",
    collegeName,
  };
}

function buildRootCause(
  type: "faculty" | "section" | "room",
  a: ConflictRowSnapshot,
  b: ConflictRowSnapshot,
): string {
  switch (type) {
    case "faculty":
      return (
        `Faculty double-booking: ${a.who} is scheduled for two classes at the same time. ` +
        `(A) ${a.what} @ ${a.when} in ${a.where} (${a.collegeName || "college"}) ` +
        `vs (B) ${b.what} @ ${b.when} in ${b.where} (${b.collegeName || "college"}).`
      );
    case "section":
      return (
        `Section overlap: ${a.what.split("·")[1]?.trim() ?? "section"} has two different subjects at the same time. ` +
        `(A) ${a.what} @ ${a.when} in ${a.where} ` +
        `vs (B) ${b.what} @ ${b.when} in ${b.where}.`
      );
    case "room":
      return (
        `Room double-booking: ${a.where} has two classes at the same time. ` +
        `(A) ${a.what} · ${a.who} @ ${a.when} ` +
        `vs (B) ${b.what} · ${b.who} @ ${b.when}.`
      );
    default:
      return `${type}: ${a.what} conflicts with ${b.what}.`;
  }
}

/**
 * Turns raw pairwise issues into deduped, human-readable campus-wide conflict rows.
 */
export function enrichCampusConflictIssues(
  rawIssues: RawIssue[],
  entryById: Map<string, ScheduleEntry>,
  subjectById: Map<string, Subject>,
  sectionById: Map<string, Section>,
  roomById: Map<string, Room>,
  userById: Map<string, User>,
  programById: Map<string, Program>,
  collegeNameById: Map<string, string>,
): EnrichedCampusIssue[] {
  const out = new Map<string, EnrichedCampusIssue>();

  for (const raw of rawIssues) {
    if (!raw.relatedEntryId) continue;
    const t = raw.type;
    if (t !== "faculty" && t !== "section" && t !== "room") continue;

    const e1 = entryById.get(raw.entryId);
    const e2 = entryById.get(raw.relatedEntryId);
    if (!e1 || !e2) continue;

    const sorted = [raw.entryId, raw.relatedEntryId].sort();
    const key = `${t}:${sorted[0]}:${sorted[1]}`;
    if (out.has(key)) continue;

    const rowA = snapshotEntry(e1, subjectById, sectionById, roomById, userById, programById, collegeNameById);
    const rowB = snapshotEntry(e2, subjectById, sectionById, roomById, userById, programById, collegeNameById);
    const rootCause = buildRootCause(t, rowA, rowB);
    out.set(key, { key, type: t, rootCause, rowA, rowB });
  }

  return [...out.values()];
}

/** Short hints for grid cells (replaces generic "Yes") after a campus scan. */
export function buildConflictGridHints(
  enriched: EnrichedCampusIssue[],
): Map<string, { faculty?: string; section?: string; room?: string }> {
  const m = new Map<string, { faculty?: string; section?: string; room?: string }>();

  function add(id: string, field: "faculty" | "section" | "room", text: string) {
    const cur = m.get(id) ?? {};
    const prev = cur[field];
    cur[field] = prev ? `${prev}; ${text}` : text;
    m.set(id, cur);
  }

  for (const iss of enriched) {
    const short = (snap: ConflictRowSnapshot) => snap.what.split("·")[0]?.trim() ?? snap.what;
    if (iss.type === "faculty") {
      add(iss.rowA.entryId, "faculty", `vs ${short(iss.rowB)}`);
      add(iss.rowB.entryId, "faculty", `vs ${short(iss.rowA)}`);
    } else if (iss.type === "section") {
      add(iss.rowA.entryId, "section", `vs ${short(iss.rowB)}`);
      add(iss.rowB.entryId, "section", `vs ${short(iss.rowA)}`);
    } else {
      add(iss.rowA.entryId, "room", `vs ${short(iss.rowB)}`);
      add(iss.rowB.entryId, "room", `vs ${short(iss.rowA)}`);
    }
  }

  return m;
}
