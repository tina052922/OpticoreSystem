import { formatTimeRange } from "@/lib/evaluator/schedule-evaluator-table";
import type { GASuggestion } from "@/lib/scheduling/types";

/** Human-readable line for buttons and tooltips (matches product examples: room · time · instructor). */
export function formatGaSuggestionShortLabel(
  s: GASuggestion,
  ctx: { roomCode: string; instructorDisplay: string },
): string {
  const when = formatTimeRange(s.startTime, s.endTime);
  return `Move to ${ctx.roomCode} · ${s.day} ${when} · ${ctx.instructorDisplay}`;
}
