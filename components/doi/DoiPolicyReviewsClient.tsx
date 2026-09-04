"use client";

import { useEffect, useMemo, useState } from "react";
import type { ScheduleLoadJustification } from "@/types/db";
import { PolicyViolationFaq } from "@/components/evaluator/PolicyViolationFaq";

export type DoiPolicyReviewRowVM = ScheduleLoadJustification & {
  collegeName: string;
  periodName: string;
  facultyName?: string | null;
  facultyWeeklyHours?: number | null;
};

function RecordCard({ row }: { row: DoiPolicyReviewRowVM }) {
  const snap = row.violationsSnapshot as { facultyWeeklyHours?: number | null } | null;
  const hours = row.facultyWeeklyHours ?? (snap?.facultyWeeklyHours ?? null);
  const facultyLabel = (row.facultyName ?? "").trim() || (row.facultyUserId ? "Selected instructor" : "Instructor");

  return (
    <li className="rounded-xl border border-black/10 bg-white shadow-sm p-5 space-y-3">
      <div className="flex flex-wrap items-center gap-2 justify-between">
        <div className="flex flex-wrap gap-2 text-xs font-semibold uppercase tracking-wide text-black/50">
          <span>{row.collegeName}</span>
          <span>·</span>
          <span>{row.periodName}</span>
          <span>·</span>
          <span>Recorded {new Date(row.createdAt).toLocaleString()}</span>
        </div>
        <span className="text-[11px] font-bold uppercase px-2 py-1 rounded-md border bg-black/[0.04] text-black/70 border-black/10">
          Recorded
        </span>
      </div>
      <div className="rounded-lg border border-black/10 bg-black/[0.02] px-3 py-2">
        <div className="text-sm font-semibold text-[#181818]">
          {facultyLabel}
          {hours != null ? (
            <span className="font-normal text-black/70">
              {" "}
              has <span className="font-semibold">{hours.toFixed(1)}</span> hours per week
            </span>
          ) : null}
        </div>
        <p className="mt-0.5 text-sm text-black/70">
          Teaching-load justification (prep/hour policy). Notification and record only — no approval step.
        </p>
        <div className="mt-1 text-xs text-black/55">
          <span className="font-semibold text-black/60">Submitted by: </span>
          <span className="font-medium">{row.authorName}</span>
        </div>
      </div>
      <div className="text-sm text-black/80 whitespace-pre-wrap border-t border-black/5 pt-3">{row.justification}</div>
    </li>
  );
}

export function DoiPolicyReviewsClient({ rows: initialRows }: { rows: DoiPolicyReviewRowVM[] }) {
  const [rows, setRows] = useState<DoiPolicyReviewRowVM[]>(initialRows);

  useEffect(() => {
    setRows(initialRows);
  }, [initialRows]);

  const sorted = useMemo(
    () => [...rows].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()),
    [rows],
  );

  if (sorted.length === 0) {
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
        <span className="font-semibold text-[#780301]">{sorted.length}</span>{" "}
        recorded teaching-load justification{sorted.length === 1 ? "" : "s"} (newest first). DOI is notified when a
        record is created; there is no accept/reject step.
      </p>
      <ul className="space-y-4">
        {sorted.map((r) => (
          <RecordCard key={r.id} row={r} />
        ))}
      </ul>
    </div>
  );
}
