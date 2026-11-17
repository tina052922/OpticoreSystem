"use client";

import type { TeachingLoadSummaryRow } from "@/lib/scheduling/teaching-load-summary";
import { TEACHING_LOAD_SUBHEADS } from "@/lib/scheduling/teaching-load-header-colors";

function fmt(n: number): string {
  return Number.isInteger(n) ? String(n) : n.toFixed(1);
}

function num(n: number): string {
  return fmt(n || 0);
}

const TH = "border border-black/60 px-2 py-1.5 font-bold";
const TD = "border border-black/20 px-2 py-2";

/**
 * One department's rows, laid out like the college's Summary of Teaching Load sheet:
 * No. · Name of Faculty · Administrative Designation · Other Responsibilities ·
 * DAY (Preps, Units/Week, Hours/Week) · EVENING (same) · Subjects Handled · Justification.
 */
export function TeachingLoadSummaryTable({
  rows,
  emptyHint,
  categoryLabel,
}: {
  rows: TeachingLoadSummaryRow[];
  emptyHint?: string;
  /** Department heading, e.g. "A. BACHELOR OF SCIENCE IN INFORMATION TECHNOLOGY". */
  categoryLabel?: string;
}) {
  return (
    <div className="overflow-x-auto">
      {categoryLabel ? (
        <div className="text-[13px] font-semibold text-[#780301] uppercase tracking-wide mb-1">{categoryLabel}</div>
      ) : null}
      <table className="w-full border-collapse min-w-[1300px] text-[12px]">
        <thead>
          {/* Black on white, PREPS / UNITS / HOURS coloured — as on the college's sheet. */}
          <tr className="bg-white text-black">
            <th rowSpan={2} className={`${TH} text-center w-12`}>No.</th>
            <th rowSpan={2} className={`${TH} text-center`}>Name of Faculty</th>
            <th rowSpan={2} className={`${TH} text-center`}>Administrative Designation</th>
            <th rowSpan={2} className={`${TH} text-center max-w-[200px] font-normal`}>
              Other Responsibilities (GAA-Funded Research &amp; Extension Projects, and Thesis Advisorship)
            </th>
            <th colSpan={3} className={`${TH} text-center text-[13px]`}>DAY</th>
            <th colSpan={3} className={`${TH} text-center text-[13px]`}>EVENING</th>
            <th rowSpan={2} className={`${TH} text-center`}>TOTAL PREPS/ WEEK</th>
            <th rowSpan={2} className={`${TH} text-center`}>TOTAL HOURS/ WEEK</th>
            <th rowSpan={2} className={`${TH} text-center`}>SUBJECT HANDLED</th>
            <th rowSpan={2} className={`${TH} text-center`}>
              JUSTIFICATION (Applicable if it violates the rule.)
            </th>
          </tr>
          <tr className="text-black text-[11px]">
            {[...TEACHING_LOAD_SUBHEADS, ...TEACHING_LOAD_SUBHEADS].map((h, k) => (
              <th key={`${h.key}-${k}`} className={`${TH} text-center`} style={{ backgroundColor: h.color }}>
                {h.label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.length === 0 ? (
            <tr>
              <td colSpan={14} className={`${TD} px-3 py-6 text-center text-[13px] text-black/55 bg-white`}>
                {emptyHint ?? "No instructors in this college for the selected term."}
              </td>
            </tr>
          ) : (
            rows.map((r, i) => (
              <tr key={r.instructorId} className={i % 2 === 1 ? "bg-[#fdf6f5]" : "bg-white"}>
                <td className={`${TD} tabular-nums text-center`}>{i + 1}</td>
                <td className={`${TD} font-medium`}>{r.facultyName}</td>
                <td className={TD}>{r.administrativeDesignation ?? ""}</td>
                <td className={`${TD} whitespace-pre-wrap`}>{r.otherResponsibilities}</td>
                <td className={`${TD} tabular-nums text-center`}>{num(r.day.preps)}</td>
                <td className={`${TD} tabular-nums text-center`}>{num(r.day.unitsPerWeek)}</td>
                <td className={`${TD} tabular-nums text-center`}>{num(r.day.hoursPerWeek)}</td>
                <td className={`${TD} tabular-nums text-center`}>{num(r.evening.preps)}</td>
                <td className={`${TD} tabular-nums text-center`}>{num(r.evening.unitsPerWeek)}</td>
                <td className={`${TD} tabular-nums text-center`}>{num(r.evening.hoursPerWeek)}</td>
                <td className={`${TD} tabular-nums text-center font-semibold`}>{num(r.totalPreps)}</td>
                <td className={`${TD} tabular-nums text-center font-semibold`}>{num(r.totalHoursPerWeek)}</td>
                <td className={`${TD} whitespace-pre-wrap`}>{r.subjectsHandled}</td>
                <td className={`${TD} whitespace-pre-wrap`}>{r.justification ?? ""}</td>
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  );
}
