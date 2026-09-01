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
    <div className="bg-white rounded-xl shadow-[0px_4px_4px_rgba(0,0,0,0.12)] overflow-hidden">
      <div className="p-4 border-b border-black/10">
        <div className="text-[16px] font-semibold">
          {categoryLabel ? `Summary of Teaching Load — ${categoryLabel}` : "Summary of Teaching Load"}
        </div>
        <div className="text-[12px] text-black/60 mt-1">
          Day Program and Evening Program are listed separately. Hours and preps come from plotted schedule entries.
        </div>
      </div>
      <div className="overflow-auto">
        <table className="w-full border-collapse min-w-[1100px]">
          <thead>
            <tr className="bg-[#ff990a] text-white text-[11px]">
              <th className="border border-black/10 px-2 py-2 text-left align-bottom" rowSpan={2}>
                Faculty Name
              </th>
              <th className="border border-black/10 px-2 py-2 text-left align-bottom" rowSpan={2}>
                Administrative Designation
              </th>
              <th className="border border-black/10 px-2 py-2 text-left align-bottom" rowSpan={2}>
                Other Responsibilities
              </th>
              <th className="border border-black/10 px-2 py-2 text-center" colSpan={3}>
                Day Program
              </th>
              <th className="border border-black/10 px-2 py-2 text-center" colSpan={3}>
                Evening Program
              </th>
              <th className="border border-black/10 px-2 py-2 text-left align-bottom" rowSpan={2}>
                Subjects Handled
              </th>
              <th className="border border-black/10 px-2 py-2 text-left align-bottom" rowSpan={2}>
                Justification
              </th>
              <th className="border border-black/10 px-2 py-2 text-center" colSpan={2}>
                Totals
              </th>
            </tr>
            <tr className="bg-[#e68a09] text-white text-[10px]">
              <th className="border border-black/10 px-2 py-1">Preps</th>
              <th className="border border-black/10 px-2 py-1">Units/Week</th>
              <th className="border border-black/10 px-2 py-1">Hours/Week</th>
              <th className="border border-black/10 px-2 py-1">Preps</th>
              <th className="border border-black/10 px-2 py-1">Units/Week</th>
              <th className="border border-black/10 px-2 py-1">Hours/Week</th>
              <th className="border border-black/10 px-2 py-1">Preps</th>
              <th className="border border-black/10 px-2 py-1">Hours/Week</th>
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 ? (
              <tr>
                <td colSpan={14} className="border border-black/10 px-3 py-6 text-center text-[13px] text-black/55">
                  {emptyHint ?? "No instructors in this college for the selected term."}
                </td>
              </tr>
            ) : (
              rows.map((r) => (
                <tr key={r.instructorId} className="text-[11px]">
                  <td className="border border-black/10 px-2 py-2 font-semibold">{r.facultyName}</td>
                  <td className="border border-black/10 px-2 py-2">{r.administrativeDesignation ?? "—"}</td>
                  <td className="border border-black/10 px-2 py-2">{r.otherResponsibilities}</td>
                  <td className="border border-black/10 px-2 py-2 tabular-nums text-center">{r.day.preps}</td>
                  <td className="border border-black/10 px-2 py-2 tabular-nums text-center">{fmt(r.day.unitsPerWeek)}</td>
                  <td className="border border-black/10 px-2 py-2 tabular-nums text-center">{fmt(r.day.hoursPerWeek)}</td>
                  <td className="border border-black/10 px-2 py-2 tabular-nums text-center">{r.evening.preps}</td>
                  <td className="border border-black/10 px-2 py-2 tabular-nums text-center">
                    {fmt(r.evening.unitsPerWeek)}
                  </td>
                  <td className="border border-black/10 px-2 py-2 tabular-nums text-center">
                    {fmt(r.evening.hoursPerWeek)}
                  </td>
                  <td className="border border-black/10 px-2 py-2">{r.subjectsHandled}</td>
                  <td className="border border-black/10 px-2 py-2 whitespace-pre-wrap">{r.justification ?? "—"}</td>
                  <td className="border border-black/10 px-2 py-2 tabular-nums text-center">{r.totalPreps}</td>
                  <td className="border border-black/10 px-2 py-2 tabular-nums text-center">{fmt(r.totalHoursPerWeek)}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
