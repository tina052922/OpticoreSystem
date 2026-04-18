"use client";

import type { EnrichedCampusIssue } from "@/lib/scheduling/conflict-enrichment";
import {
  conflictHeadlineShort,
  parseSnapshotSubjectSection,
  summarizeConflictIssueTypes,
} from "@/lib/scheduling/conflict-enrichment";
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
  /** Extra controls per issue (e.g. DOI “Show in grid”, chairman locked row). */
  renderIssueFooter?: (issue: EnrichedCampusIssue) => React.ReactNode;
  /** Optional title override */
  title?: string;
  /** Compact = smaller type; default shows comparison grid */
  variant?: "default" | "compact";
};

function typeBadge(type: EnrichedCampusIssue["type"]) {
  const base =
    "inline-flex items-center rounded-md px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide border";
  switch (type) {
    case "faculty":
      return <span className={`${base} border-blue-200 bg-blue-50 text-blue-950`}>Faculty</span>;
    case "room":
      return <span className={`${base} border-amber-300 bg-amber-50 text-amber-950`}>Room</span>;
    case "section":
      return <span className={`${base} border-violet-200 bg-violet-50 text-violet-950`}>Section</span>;
    default:
      return null;
  }
}

function SnapshotDigest({ label, snap }: { label: string; snap: EnrichedCampusIssue["rowA"] }) {
  const { subject, section } = parseSnapshotSubjectSection(snap.what);
  return (
    <div className="rounded-md border border-red-100/90 bg-white/95 px-2 py-1.5 text-[11px] leading-snug">
      <p className="font-bold text-red-950/90 mb-1">{label}</p>
      <dl className="grid grid-cols-[auto_1fr] gap-x-2 gap-y-0.5 text-red-950/85">
        <dt className="text-red-800/70 font-medium">Subject</dt>
        <dd className="min-w-0">{subject}</dd>
        <dt className="text-red-800/70 font-medium">Section</dt>
        <dd className="min-w-0">{section}</dd>
        <dt className="text-red-800/70 font-medium">Time</dt>
        <dd>{snap.when}</dd>
        <dt className="text-red-800/70 font-medium">Room</dt>
        <dd>{snap.where}</dd>
        <dt className="text-red-800/70 font-medium">Faculty</dt>
        <dd className="min-w-0">{snap.who}</dd>
        {snap.collegeName ? (
          <>
            <dt className="text-red-800/70 font-medium">College</dt>
            <dd className="min-w-0">{snap.collegeName}</dd>
          </>
        ) : null}
      </dl>
    </div>
  );
}

/**
 * Readable conflict list: room / faculty / section double-booking with optional GA apply actions.
 * Design is shared across Program Chairman, Central Hub, GEC, and DOI.
 */
export function EnrichedConflictIssuesPanel({
  issues,
  suggestionsByIssueKey = {},
  busyIssueKey = null,
  onApplySuggestion,
  allowApply = true,
  maxIssues = 14,
  formatSuggestionLabel,
  renderIssueFooter,
  title = "Conflict detail",
  variant = "default",
}: EnrichedConflictIssuesPanelProps) {
  if (!issues.length) return null;

  const shown = issues.slice(0, maxIssues);
  const stats = summarizeConflictIssueTypes(issues);
  const compact = variant === "compact";

  return (
    <div
      className={`rounded-xl border border-red-200/90 bg-red-50/70 px-3 py-3 ${compact ? "text-xs" : "text-sm"} text-red-950`}
    >
      <div className="flex flex-wrap items-start justify-between gap-2 mb-2">
        <p className={`font-bold text-red-950 ${compact ? "text-[13px]" : "text-[15px]"}`}>{title}</p>
        <div className="flex flex-wrap gap-1.5 justify-end text-[10px] font-semibold text-red-900/90">
          <span className="rounded bg-white/80 border border-red-100 px-2 py-0.5">{stats.total} issue(s)</span>
          {stats.faculty > 0 ? (
            <span className="rounded bg-white/80 border border-blue-100 px-2 py-0.5">{stats.faculty} faculty</span>
          ) : null}
          {stats.room > 0 ? (
            <span className="rounded bg-white/80 border border-amber-100 px-2 py-0.5">{stats.room} room</span>
          ) : null}
          {stats.section > 0 ? (
            <span className="rounded bg-white/80 border border-violet-100 px-2 py-0.5">{stats.section} section</span>
          ) : null}
        </div>
      </div>

      <ul className={`space-y-3 ${compact ? "max-h-[min(42vh,360px)]" : "max-h-[min(50vh,480px)]"} overflow-y-auto pr-0.5`}>
        {shown.map((iss) => {
          const sug = suggestionsByIssueKey[iss.key] ?? [];
          const headline = conflictHeadlineShort(iss);
          return (
            <li
              key={iss.key}
              className={`rounded-lg border border-red-200/80 bg-white/90 shadow-sm ${compact ? "px-2 py-2" : "px-3 py-2.5"}`}
            >
              <div className="flex flex-wrap items-center gap-2 mb-1.5">
                {typeBadge(iss.type)}
                <p className={`font-semibold text-red-950 flex-1 min-w-0 ${compact ? "text-[11px]" : "text-[13px]"}`}>
                  {headline}
                </p>
              </div>

              <div className={`grid grid-cols-1 ${compact ? "sm:grid-cols-1" : "md:grid-cols-2"} gap-2 mb-2`}>
                <SnapshotDigest label="Row A (adjust this row when applying a suggestion)" snap={iss.rowA} />
                <SnapshotDigest label="Conflicts with (row B)" snap={iss.rowB} />
              </div>

              <details className="mb-2 group">
                <summary className="cursor-pointer text-[10px] font-semibold text-red-800/80 hover:text-red-950 list-none flex items-center gap-1">
                  <span className="group-open:hidden">▸ Full explanation</span>
                  <span className="hidden group-open:inline">▾ Full explanation</span>
                </summary>
                <p className="mt-1.5 text-[11px] leading-snug text-red-950/85 pl-0.5">{iss.rootCause}</p>
              </details>

              {renderIssueFooter ? <div className="mb-2 flex flex-wrap gap-2">{renderIssueFooter(iss)}</div> : null}

              <div className="flex flex-wrap gap-1.5">
                {allowApply && onApplySuggestion && sug.length > 0
                  ? sug.slice(0, 5).map((s, i) => {
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
                          {cap.length > 110 ? `${cap.slice(0, 107)}…` : cap}
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
        <p className="text-[11px] text-red-900/75 mt-2">
          Showing {maxIssues} of {issues.length} pairwise issues. Run another check after fixes to refresh counts.
        </p>
      ) : null}
    </div>
  );
}
