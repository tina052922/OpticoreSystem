import { formatTimeRange } from "@/lib/evaluator/schedule-evaluator-table";
import type { GASuggestion } from "@/lib/scheduling/types";

/** One-line alternative slot from the rule-based resolver (room, time, optional assignee). */
export function formatGaSuggestionShortLabel(
  s: GASuggestion,
  ctx: { roomCode: string; instructorDisplay: string },
): string {
  const when = formatTimeRange(s.startTime, s.endTime);
  return `Use ${ctx.roomCode} on ${s.day} ${when} (instructor: ${ctx.instructorDisplay})`;
}
