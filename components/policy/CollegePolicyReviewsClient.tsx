"use client";

import { useEffect, useMemo, useState } from "react";
import type { ScheduleLoadJustification } from "@/types/db";
import { PolicyViolationFaq } from "@/components/evaluator/PolicyViolationFaq";

export type CollegePolicyReviewRowVM = ScheduleLoadJustification & {
  collegeName: string;
  periodName: string;
  instructorLabel: string | null;
};

export function CollegePolicyReviewsClient({
  rows: initialRows,
}: {
  rows: CollegePolicyReviewRowVM[];
  realtimeCollegeId?: string | null;
}) {
  const [rows, setRows] = useState(initialRows);

  useEffect(() => {
    setRows(initialRows);
  }, [initialRows]);

  const shown = useMemo(
    () => [...rows].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()),
    [rows],
  );

  if (rows.length === 0) {
    return (
      <div className="space-y-4">
        <PolicyViolationFaq />
        <div className="rounded-xl border border-black/10 bg-white p-8 text-sm text-black/60">No justifications recorded yet.</div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <PolicyViolationFaq />
      <p className="text-sm text-black/60">
        Recorded overload justifications for this college. DOI is notified when each is submitted; there is no approval
        workflow. The same text appears on Summary of Teaching Load and the instructor’s Faculty Profile.
      </p>
      <ul className="space-y-4">
        {shown.map((r) => {
          const snap = r.violationsSnapshot as { summary?: string } | null;
          return (
            <li key={r.id} className="rounded-xl border border-black/10 bg-white shadow-sm p-5 space-y-3">
              <div className="flex flex-wrap items-center gap-2 justify-between">
                <div className="flex flex-wrap gap-2 text-xs font-semibold uppercase tracking-wide text-black/50">
                  <span>{r.collegeName}</span>
                  <span>·</span>
                  <span>{r.periodName}</span>
                  <span>·</span>
                  <span>Recorded {new Date(r.createdAt).toLocaleString()}</span>
                </div>
                <span className="text-[11px] font-bold uppercase px-2 py-1 rounded-md border bg-black/[0.04] text-black/70 border-black/10">
                  Recorded
                </span>
              </div>
              <div className="text-sm">
                <span className="text-black/50">Author: </span>
                <span className="font-medium">{r.authorName}</span>
                {r.authorEmail ? <span className="text-black/60"> ({r.authorEmail})</span> : null}
              </div>
              {r.instructorLabel ? (
                <div className="text-sm text-black/80">
                  <span className="text-black/50">Instructor: </span>
                  <span className="font-medium">{r.instructorLabel}</span>
                </div>
              ) : null}
              <div className="text-sm text-black/80 whitespace-pre-wrap border-t border-black/5 pt-3">{r.justification}</div>
              {snap && typeof snap === "object" && "summary" in snap && snap.summary ? (
                <div className="text-xs text-black/50 font-mono bg-black/[0.03] rounded p-2">{snap.summary}</div>
              ) : null}
            </li>
          );
        })}
      </ul>
    </div>
  );
}
