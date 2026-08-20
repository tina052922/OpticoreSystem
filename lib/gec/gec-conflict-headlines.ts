import type { EnrichedCampusIssue } from "@/lib/scheduling/conflict-enrichment";

/** "CC 112 (BSIT 1B)" from snapshot `what` = "CC 112 · BSIT 1B". */
function subjectSectionLabel(what: string): string {
  const parts = what.split("·").map((p) => p.trim());
  if (parts.length >= 2) return `${parts[0]} (${parts[1]})`;
  return what.trim() || "—";
}

/**
 * Short, chair-facing lines (examples from product spec) for GEC Central Hub conflict strip.
 */
export function formatGecChairConflictHeadline(iss: EnrichedCampusIssue): string {
  const a = iss.rowA;
  const b = iss.rowB;
  if (iss.type === "room") {
    return `Room ${b.where} is occupied by ${subjectSectionLabel(b.what)} at ${b.when}`;
  }
  if (iss.type === "faculty") {
    return `Instructor ${a.who} is already assigned in another program (${subjectSectionLabel(b.what)} at ${b.when})`;
  }
  if (iss.type === "section") {
    const secName = a.what.split("·")[1]?.trim() ?? a.what;
    return `Section ${secName} already has a class at the same time (${subjectSectionLabel(b.what)} · ${b.when})`;
  }
  return iss.rootCause;
}
