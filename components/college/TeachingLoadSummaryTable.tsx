"use client";

import type { TeachingLoadSummaryRow } from "@/lib/scheduling/teaching-load-summary";

function fmt(n: number): string {
  return Number.isInteger(n) ? String(n) : n.toFixed(1);
}

export function TeachingLoadSummaryTable({
  rows,
  emptyHint,
  categoryLabel,
}: {
  rows: TeachingLoadSummaryRow[];
  emptyHint?: string;
  /** Department / program heading (e.g. BSIT, BIT – Automotive). */
  categoryLabel?: string;
}) {
  return (
    <div className="overflow-x-auto">
      {categoryLabel ? (
        <div className="text-[13px] font-semibold text-[#780301] uppercase tracking-wide mb-1">{categoryLabel}</div>
      ) : null}
      <table className="w-full border-collapse min-w-[920px] text-[12px]">
        <thead>
          <tr className="bg-[#780301] text-white">
            <th className="border border-black/20 px-2 py-2 text-center w-12">No.</th>
            <th className="border border-black/20 px-2 py-2 text-left">Name</th>
            <th className="border border-black/20 px-2 py-2 text-left">Designation</th>
            <th className="border border-black/20 px-2 py-2 text-center">Day Preps</th>
            <th className="border border-black/20 px-2 py-2 text-center">Day Hrs/Wk</th>
            <th className="border border-black/20 px-2 py-2 text-center">Eve Preps</th>
            <th className="border border-black/20 px-2 py-2 text-center">Eve Hrs/Wk</th>
            <th className="border border-black/20 px-2 py-2 text-left">Subjects Handled</th>
            <th className="border border-black/20 px-2 py-2 text-left">Justification</th>
          </tr>
        </thead>
        <tbody>
          {rows.length === 0 ? (
            <tr>
              <td colSpan={9} className="border border-black/20 px-3 py-6 text-center text-[13px] text-black/55 bg-white">
                {emptyHint ?? "No instructors in this college for the selected term."}
              </td>
            </tr>
          ) : (
            rows.map((r, i) => (
              <tr key={r.instructorId} className={i % 2 === 1 ? "bg-[#fdf6f5]" : "bg-white"}>
                <td className="border border-black/20 px-2 py-2 tabular-nums text-center">{i + 1}</td>
                <td className="border border-black/20 px-2 py-2 font-medium">{r.facultyName}</td>
                <td className="border border-black/20 px-2 py-2">{r.administrativeDesignation ?? "—"}</td>
                <td className="border border-black/20 px-2 py-2 tabular-nums text-center">{r.day.preps}</td>
                <td className="border border-black/20 px-2 py-2 tabular-nums text-center">{fmt(r.day.hoursPerWeek)}</td>
                <td className="border border-black/20 px-2 py-2 tabular-nums text-center">{r.evening.preps}</td>
                <td className="border border-black/20 px-2 py-2 tabular-nums text-center">{fmt(r.evening.hoursPerWeek)}</td>
                <td className="border border-black/20 px-2 py-2">{r.subjectsHandled}</td>
                <td className="border border-black/20 px-2 py-2 whitespace-pre-wrap">{r.justification ?? ""}</td>
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  );
}
