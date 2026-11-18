import { detectConflictsSparse, type SparseScheduleBlock } from "@/lib/scheduling/conflicts";
import { timesFromSlotRange } from "@/lib/evaluator/plot-duration";
import { formatTimeRange12h } from "@/lib/time/format-12h";
import type { HourSlot, ProgramMode } from "@/lib/scheduling/program-mode";
import type { ResolvedPlotMeeting } from "@/lib/evaluator/plot-meetings";

/**
 * Before a plot is saved: does any day's typed start + duration land on a class that is already
 * plotted — in the same section, for the same instructor, or in the same room?
 *
 * Returns one plain sentence per clash, naming the subject already there, e.g.
 *   "Monday 1:30 PM – 2:30 PM overlaps CC-111 (1:00 PM – 2:30 PM) already plotted in this section."
 * Empty when every day is free.
 */
export function plotStartConflicts(args: {
  meetings: ResolvedPlotMeeting[];
  /** The row being plotted (its id is ignored as a clash with itself). */
  base: {
    id: string;
    academicPeriodId: string;
    sectionId?: string | null;
    instructorId?: string | null;
    roomId?: string | null;
  };
  slots: HourSlot[];
  programMode: ProgramMode;
  existingBlocks: SparseScheduleBlock[];
  /** Subject code / name for an existing entry id, for the message. */
  labelForEntry?: (entryId: string) => string | undefined;
}): string[] {
  const out: string[] = [];
  const seen = new Set<string>();
  const byId = new Map(args.existingBlocks.map((b) => [b.id, b]));
  const what: Record<string, string> = {
    section: "in this section",
    faculty: "for this instructor",
    room: "in this room",
  };
  for (const m of args.meetings) {
    const times = timesFromSlotRange(m.startSlotIndex, m.durationSlots, args.slots);
    if (!times) continue;
    const candidate: SparseScheduleBlock = {
      id: args.base.id,
      academicPeriodId: args.base.academicPeriodId,
      day: m.day,
      startTime: times.startTime,
      endTime: times.endTime,
      instructorId: args.base.instructorId?.trim() ? args.base.instructorId : null,
      sectionId: args.base.sectionId?.trim() ? args.base.sectionId : null,
      roomId: args.base.roomId?.trim() ? args.base.roomId : null,
      programMode: args.programMode,
    };
    for (const hit of detectConflictsSparse(candidate, args.existingBlocks, args.base.id)) {
      const otherId = hit.withEntryId ?? "";
      const key = `${m.day}|${otherId}|${hit.type}`;
      if (seen.has(key)) continue;
      seen.add(key);
      const other = otherId ? byId.get(otherId) : undefined;
      const name = (otherId && args.labelForEntry?.(otherId)) || "another subject";
      const otherWhen = other ? ` (${formatTimeRange12h(other.startTime, other.endTime)})` : "";
      out.push(
        `${m.day} ${formatTimeRange12h(times.startTime, times.endTime)} overlaps ${name}${otherWhen} already plotted ${
          what[hit.type] ?? ""
        }. Pick another start time.`,
      );
    }
  }
  return out;
}
