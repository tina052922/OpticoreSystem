"use client";

import { useEffect, useMemo, useState } from "react";
import { apiFetch } from "@/lib/api/client";
import type { ScheduleLoadJustification } from "@/types/db";
import { useSemesterFilterOptional } from "@/contexts/SemesterFilterContext";

/**
 * Per-instructor teaching-load justification history (record only — no approval).
 */
export function FacultyLoadJustificationRecord({
  facultyUserId,
  collegeId,
  canClear = true,
  onCleared,
}: {
  facultyUserId: string;
  collegeId: string | null;
  /** Chairman / GEC Chairman / College Admin / DOI may clear a record; the API enforces the same. */
  canClear?: boolean;
  /** Lets the page refresh anything that showed the cleared text. */
  onCleared?: () => void;
}) {
  const semester = useSemesterFilterOptional();
  const periodId = semester?.selectedPeriodId ?? "";
  const [rows, setRows] = useState<ScheduleLoadJustification[]>([]);
  const [loading, setLoading] = useState(false);
  const [confirmingId, setConfirmingId] = useState<string | null>(null);
  const [clearingId, setClearingId] = useState<string | null>(null);
  const [clearError, setClearError] = useState<string | null>(null);

  /**
   * Removes the record. Once gone, the Evaluator asks for a new justification the next time this
   * faculty breaches policy, and Summary of Teaching Load no longer prints the old text.
   */
  async function clearJustification(id: string) {
    setClearError(null);
    setClearingId(id);
    try {
      await apiFetch(`/api/catalog/schedule-load-justifications/${encodeURIComponent(id)}`, {
        method: "DELETE",
      });
      setRows((prev) => prev.filter((r) => r.id !== id));
      setConfirmingId(null);
      onCleared?.();
    } catch (err) {
      setClearError(err instanceof Error ? err.message : "Failed to clear the justification.");
    } finally {
      setClearingId(null);
    }
  }

  useEffect(() => {
    if (!facultyUserId) {
      setRows([]);
      return;
    }
    let cancelled = false;
    setLoading(true);
    const qs = new URLSearchParams();
    qs.set("facultyUserId", facultyUserId);
    if (collegeId) qs.set("collegeId", collegeId);
    if (periodId) qs.set("academicPeriodId", periodId);
    void apiFetch<{ justifications: ScheduleLoadJustification[] }>(
      `/api/catalog/schedule-load-justifications?${qs.toString()}`,
      { method: "GET" },
    )
      .then((data) => {
        if (!cancelled) setRows(data.justifications ?? []);
      })
      .catch(() => {
        if (!cancelled) setRows([]);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [facultyUserId, collegeId, periodId]);

  const latest = rows[0] ?? null;
  const periodLabel = semester?.selectedPeriod?.name ?? "this term";

  const list = useMemo(() => rows.slice(0, 8), [rows]);

  return (
    <div className="rounded-lg border border-amber-200 bg-amber-50/60 px-3 py-3 space-y-2">
      <div className="text-[13px] font-semibold text-amber-950">Load justification record</div>
      <p className="text-[11px] text-amber-950/80 leading-relaxed">
        Recorded when plotted hours or preparations exceed policy. DOI is notified; there is no approval step. Same
        text appears on College Admin Summary of Teaching Load ({periodLabel}).
      </p>
      {clearError ? (
        <p className="text-[12px] text-red-800 bg-red-50 border border-red-200 rounded-md px-2 py-1.5">
          {clearError}
        </p>
      ) : null}
      {loading ? (
        <p className="text-[12px] text-black/50">Loading…</p>
      ) : !latest ? (
        <p className="text-[12px] text-black/55">No justification recorded for this instructor in the selected term.</p>
      ) : (
        <ul className="space-y-2">
          {list.map((j) => (
            <li key={j.id} className="rounded-md border border-black/10 bg-white px-2.5 py-2 text-[12px]">
              <div className="flex items-start justify-between gap-2">
                <div className="text-[11px] text-black/50">
                  {new Date(j.createdAt).toLocaleString()}
                  {j.authorName ? ` · ${j.authorName}` : ""}
                </div>
                {canClear ? (
                  confirmingId === j.id ? (
                    <span className="flex items-center gap-2 shrink-0">
                      <button
                        type="button"
                        className="text-[11px] font-semibold text-red-800 hover:underline disabled:opacity-50"
                        disabled={clearingId === j.id}
                        onClick={() => void clearJustification(j.id)}
                      >
                        {clearingId === j.id ? "Clearing\u2026" : "Confirm clear"}
                      </button>
                      <button
                        type="button"
                        className="text-[11px] text-black/55 hover:underline"
                        disabled={clearingId === j.id}
                        onClick={() => setConfirmingId(null)}
                      >
                        Cancel
                      </button>
                    </span>
                  ) : (
                    <button
                      type="button"
                      className="text-[11px] font-semibold text-red-800 hover:underline shrink-0"
                      onClick={() => {
                        setClearError(null);
                        setConfirmingId(j.id);
                      }}
                    >
                      Clear
                    </button>
                  )
                ) : null}
              </div>
              <div className="mt-1 whitespace-pre-wrap text-black/85">{j.justification}</div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
