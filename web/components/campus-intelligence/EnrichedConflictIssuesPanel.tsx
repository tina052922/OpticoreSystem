"use client";

import type { EnrichedCampusIssue } from "@/lib/scheduling/conflict-enrichment";
import type { GASuggestion } from "@/lib/scheduling/types";
import { Button } from "@/components/ui/button";

export type EnrichedConflictIssuesPanelProps = {
  issues: EnrichedCampusIssue[];
  /** Optional GA suggestions keyed by issue.key */
  suggestionsByIssueKey?: Record<string, GASuggestion[]>;
  busyIssueKey?: string | null;
  onApplySuggestion?: (issueKey: string, suggestion: GASuggestion) => void | Promise<void>;
  /** When false, hide apply buttons (e.g. read-only DOI view). */
  allowApply?: boolean;
  maxIssues?: number;
  /** Human-readable one-line fix, e.g. room code + time + instructor name. */
  formatSuggestionLabel?: (s: GASuggestion) => string;
};

/**
 * Readable conflict list: room / faculty / section double-booking with optional GA apply actions.
 */
export function EnrichedConflictIssuesPanel({
  issues,
  suggestionsByIssueKey = {},
  busyIssueKey = null,
  onApplySuggestion,
  allowApply = true,
  maxIssues = 12,
  formatSuggestionLabel,
}: EnrichedConflictIssuesPanelProps) {
  if (!issues.length) return null;

  const shown = issues.slice(0, maxIssues);

  return (
    <div className="rounded-xl border border-red-200/90 bg-red-50/70 px-4 py-3 space-y-3 text-sm text-red-950">
      <p className="font-bold text-red-950 text-[15px]">Conflict detail (specific resources &amp; times)</p>
      <ul className="space-y-3">
        {shown.map((iss) => {
          const sug = suggestionsByIssueKey[iss.key] ?? [];
          return (
            <li key={iss.key} className="rounded-lg border border-red-200/80 bg-white/90 px-3 py-2.5 shadow-sm">
              <p className="text-[13px] leading-snug text-red-950/95">{iss.rootCause}</p>
              <div className="mt-2 flex flex-wrap gap-1.5">
                {allowApply && onApplySuggestion && sug.length > 0
                  ? sug.slice(0, 4).map((s, i) => {
                      const cap = formatSuggestionLabel ? formatSuggestionLabel(s) : s.label;
                      return (
                        <Button
                          key={`${iss.key}-s${i}`}
                          type="button"
                          size="sm"
                          variant="outline"
                          className="h-8 text-[11px] border-amber-400/80 text-amber-950 hover:bg-amber-50 max-w-full text-left whitespace-normal"
                          disabled={busyIssueKey === iss.key}
                          onClick={() => void onApplySuggestion(iss.key, s)}
                          title={cap}
                        >
                          {cap.length > 96 ? `${cap.slice(0, 93)}…` : cap}
                        </Button>
                      );
                    })
                  : null}
              </div>
            </li>
          );
        })}
      </ul>
      {issues.length > maxIssues ? (
        <p className="text-[11px] text-red-900/75">Showing {maxIssues} of {issues.length} pairwise issues.</p>
      ) : null}
    </div>
  );
}
