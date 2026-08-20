import type { ConflictHit } from "@/lib/scheduling/types";
import type { SparseScheduleBlock } from "@/lib/scheduling/conflicts";

export function formatSparseConflictLines(
  hits: ConflictHit[],
  universe: SparseScheduleBlock[],
  labels: {
    instructorName?: string;
    sectionName?: string;
    roomCode?: string;
    subjectCode?: string;
    when?: string;
  },
): string[] {
  const lines: string[] = [];
  const seen = new Set<string>();

  for (const h of hits) {
    const other = h.withEntryId ? universe.find((b) => b.id === h.withEntryId) : undefined;
    const overlapWhen = other
      ? `${other.day} ${other.startTime.slice(0, 5)}–${other.endTime.slice(0, 5)}`
      : labels.when ?? "this time";

    let line = "";
    if (h.type === "faculty") {
      const who = labels.instructorName?.trim() || "This instructor";
      line = `${who} is double-booked: overlaps another assignment on ${overlapWhen}.`;
    } else if (h.type === "room") {
      const room = labels.roomCode?.trim() || "This room";
      line = `${room} is already in use on ${overlapWhen}.`;
    } else if (h.type === "section") {
      const sec = labels.sectionName?.trim() || "This section";
      const subj = labels.subjectCode?.trim();
      line = subj
        ? `${sec} already has ${subj} scheduled on ${overlapWhen}.`
        : `${sec} has another class on ${overlapWhen}.`;
    } else {
      line = h.message;
    }

    if (!seen.has(line)) {
      seen.add(line);
      lines.push(line);
    }
  }
  return lines;
}
