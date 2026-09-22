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

function RecordCard({
  row,
  confirming,
  clearing,
  onAskClear,
  onCancelClear,
  onConfirmClear,
}: {
  row: DoiPolicyReviewRowVM;
  confirming: boolean;
  clearing: boolean;
  onAskClear: () => void;
  onCancelClear: () => void;
  onConfirmClear: () => Promise<void>;
}) {
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
        <div className="flex items-center gap-2">
          <span className="text-[11px] font-bold uppercase px-2 py-1 rounded-md border bg-black/[0.04] text-black/70 border-black/10">
            Recorded
          </span>
          {confirming ? (
            <>
              <button
                type="button"
                className="text-[11px] font-semibold text-red-800 hover:underline disabled:opacity-50"
                disabled={clearing}
                onClick={() => void onConfirmClear()}
              >
                {clearing ? "Clearing\u2026" : "Confirm clear"}
              </button>
              <button
                type="button"
                className="text-[11px] text-black/55 hover:underline"
                disabled={clearing}
                onClick={() => onCancelClear()}
              >
                Cancel
              </button>
            </>
          ) : (
            <button
              type="button"
              className="text-[11px] font-semibold text-red-800 hover:underline"
              onClick={() => onAskClear()}
            >
              Clear
            </button>
          )}
        </div>
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
  const [confirmingId, setConfirmingId] = useState<string | null>(null);
  const [clearingId, setClearingId] = useState<string | null>(null);
  const [clearError, setClearError] = useState<string | null>(null);

  /** Removing the record makes the Evaluator ask for a fresh justification on the next breach. */
  async function clearJustification(id: string) {
    setClearError(null);
    setClearingId(id);
    try {
      const { apiFetch } = await import("@/lib/api/client");
      await apiFetch(`/api/catalog/schedule-load-justifications/${encodeURIComponent(id)}`, {
        method: "DELETE",
      });
      setRows((prev) => prev.filter((row) => row.id !== id));
      setConfirmingId(null);
    } catch (err) {
      setClearError(err instanceof Error ? err.message : "Failed to clear the justification.");
    } finally {
      setClearingId(null);
    }
  }

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
      {clearError ? (
        <p className="text-sm text-red-800 bg-red-50 border border-red-200 rounded-md px-3 py-2">{clearError}</p>
      ) : null}
      <ul className="space-y-4">
        {sorted.map((r) => (
          <RecordCard
            key={r.id}
            row={r}
            confirming={confirmingId === r.id}
            clearing={clearingId === r.id}
            onAskClear={() => {
              setClearError(null);
              setConfirmingId(r.id);
            }}
            onCancelClear={() => setConfirmingId(null)}
            onConfirmClear={() => clearJustification(r.id)}
          />
        ))}
      </ul>
    </div>
  );
}
