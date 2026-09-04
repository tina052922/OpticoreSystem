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
}: {
  facultyUserId: string;
  collegeId: string | null;
}) {
  const semester = useSemesterFilterOptional();
  const periodId = semester?.selectedPeriodId ?? "";
  const [rows, setRows] = useState<ScheduleLoadJustification[]>([]);
  const [loading, setLoading] = useState(false);

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
      {loading ? (
        <p className="text-[12px] text-black/50">Loading…</p>
      ) : !latest ? (
        <p className="text-[12px] text-black/55">No justification recorded for this instructor in the selected term.</p>
      ) : (
        <ul className="space-y-2">
          {list.map((j) => (
            <li key={j.id} className="rounded-md border border-black/10 bg-white px-2.5 py-2 text-[12px]">
              <div className="text-[11px] text-black/50">
                {new Date(j.createdAt).toLocaleString()}
                {j.authorName ? ` · ${j.authorName}` : ""}
              </div>
              <div className="mt-1 whitespace-pre-wrap text-black/85">{j.justification}</div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
