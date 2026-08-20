"use client";

import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { ScheduleLoadJustification } from "@/types/db";
import { policyReviewsApi } from "@/lib/api/client";
import { PolicyViolationFaq } from "@/components/evaluator/PolicyViolationFaq";

export type CollegePolicyReviewRowVM = ScheduleLoadJustification & {
  collegeName: string;
  periodName: string;
  instructorLabel: string | null;
};

function decisionLabel(d: ScheduleLoadJustification["doiDecision"]): string {
  if (d === "accepted") return "Accepted";
  if (d === "rejected") return "Rejected";
  if (d === "pending") return "Pending";
  return "Not reviewed";
}

function decisionBadgeClass(d: ScheduleLoadJustification["doiDecision"]): string {
  if (d === "accepted") return "bg-emerald-100 text-emerald-900 border-emerald-200";
  if (d === "rejected") return "bg-red-100 text-red-900 border-red-200";
  if (d === "pending") return "bg-amber-100 text-amber-900 border-amber-200";
  return "bg-black/[0.04] text-black/60 border-black/10";
}

function isPendingRow(d: ScheduleLoadJustification["doiDecision"] | null | undefined): boolean {
  return d == null || d === "pending";
}

type FilterMode = "pending" | "all";

export function CollegePolicyReviewsClient({
  rows: initialRows,
  realtimeCollegeId = null,
}: {
  rows: CollegePolicyReviewRowVM[];
  realtimeCollegeId?: string | null;
}) {
  const router = useRouter();
  const [rows, setRows] = useState(initialRows);
  const [filter, setFilter] = useState<FilterMode>("pending");

  useEffect(() => {
    setRows(initialRows);
  }, [initialRows]);

  // Poll every 30s to pick up new submissions or DOI decisions
  useEffect(() => {
    const interval = setInterval(() => {
      router.refresh();
    }, 30_000);
    return () => clearInterval(interval);
  }, [router]);

  const pendingRows = useMemo(() => rows.filter((r) => isPendingRow(r.doiDecision)), [rows]);
  const shown = useMemo(
    () => (filter === "pending" ? pendingRows : [...rows].sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime())),
    [rows, filter, pendingRows],
  );

  const chip = useCallback(
    (mode: FilterMode, label: string, count: number) => (
      <button
        key={mode}
        type="button"
        onClick={() => setFilter(mode)}
        className={`rounded-full px-3 py-1.5 text-xs font-semibold border transition-colors ${
          filter === mode
            ? "bg-[#FF990A] text-white border-[#e88909] shadow-sm"
            : "bg-white text-black/70 border-black/10 hover:bg-black/[0.03]"
        }`}
      >
        {label}
        {count > 0 ? (
          <span className={`ml-1.5 tabular-nums ${filter === mode ? "text-white/95" : "text-[#DE0602]"}`}>({count})</span>
        ) : null}
      </button>
    ),
    [filter],
  );

  if (rows.length === 0) {
    return (
      <div className="space-y-4">
        <PolicyViolationFaq />
        <div className="rounded-xl border border-black/10 bg-white p-8 text-sm text-black/60">No submissions yet.</div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <PolicyViolationFaq />
      <div className="flex flex-wrap items-center gap-2">
        {chip("pending", "Pending VPAA review", pendingRows.length)}
        {chip("all", "All submissions", rows.length)}
      </div>

      {filter === "pending" && shown.length === 0 ? (
        <div className="rounded-xl border border-dashed border-black/15 bg-white p-6 text-sm text-black/60">
          No pending justifications. Switch to <strong>All submissions</strong> for history.
        </div>
      ) : (
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
                    <span>Updated {new Date(r.updatedAt).toLocaleString()}</span>
                  </div>
                  <span
                    className={`text-[11px] font-bold uppercase px-2 py-1 rounded-md border ${decisionBadgeClass(r.doiDecision ?? null)}`}
                  >
                    {decisionLabel(r.doiDecision ?? null)}
                  </span>
                </div>
                {r.doiReviewedAt ? (
                  <p className="text-xs text-black/55">
                    <span className="font-semibold text-black/60">VPAA reviewed: </span>
                    {new Date(r.doiReviewedAt).toLocaleString()}
                  </p>
                ) : null}
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
                {r.scheduleEntryId ? (
                  <div className="text-xs text-black/55">
                    <span className="font-semibold text-black/60">Schedule entry: </span>
                    <span className="font-mono">{r.scheduleEntryId}</span>
                  </div>
                ) : null}
                <div className="text-sm text-black/80 whitespace-pre-wrap border-t border-black/5 pt-3">{r.justification}</div>
                {snap && typeof snap === "object" && "summary" in snap && snap.summary ? (
                  <div className="text-xs text-black/50 font-mono bg-black/[0.03] rounded p-2">{snap.summary}</div>
                ) : null}
                {r.doiReviewNote && r.doiDecision ? (
                  <div className="text-xs text-black/55">
                    <span className="font-semibold">VPAA note: </span>
                    {r.doiReviewNote}
                  </div>
                ) : null}
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
