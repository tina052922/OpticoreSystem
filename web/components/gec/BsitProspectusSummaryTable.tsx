"use client";

import { useMemo, useState } from "react";
import { groupBsitProspectusByYearAndSemester } from "@/lib/gec/bsit-prospectus-summary";

type Props = {
  /** When user picks a code, vacant-row subject dropdowns can prefill from this. */
  onSelectSubjectCode?: (code: string | null) => void;
  className?: string;
};

/**
 * Predefined BSIT prospectus summary (Year Level × Semester) for GEC Chairman context.
 * Placed above the plotting grid per product layout.
 */
export function BsitProspectusSummaryTable({ onSelectSubjectCode, className = "" }: Props) {
  const groups = useMemo(() => groupBsitProspectusByYearAndSemester(), []);
  const [activeCode, setActiveCode] = useState<string | null>(null);

  function pick(code: string) {
    const next = activeCode === code ? null : code;
    setActiveCode(next);
    onSelectSubjectCode?.(next);
  }

  return (
    <div className={`rounded-xl border border-black/10 bg-white shadow-[0px_4px_4px_rgba(0,0,0,0.08)] overflow-hidden ${className}`}>
      <div className="bg-[#780301] text-white px-4 py-3">
        <h3 className="text-sm font-bold tracking-tight">Predefined summary of subjects (BSIT prospectus)</h3>
        <p className="text-[11px] text-white/85 mt-1">
          Grouped by year level and semester. Click a row to select a code — then assign it in a highlighted vacant GEC
          slot in the grid below (when your access is approved).
        </p>
      </div>
      <div className="max-h-[320px] overflow-y-auto">
        <table className="w-full border-collapse text-[11px]">
          <thead className="sticky top-0 z-[1]">
            <tr className="bg-[#ff990a] text-white">
              <th className="border border-black/10 px-2 py-2 text-left font-bold w-[100px]">Year · Sem</th>
              <th className="border border-black/10 px-2 py-2 text-left font-bold">Code</th>
              <th className="border border-black/10 px-2 py-2 text-left font-bold">Title</th>
              <th className="border border-black/10 px-2 py-2 text-right font-bold w-[52px]">Lec U</th>
              <th className="border border-black/10 px-2 py-2 text-right font-bold w-[52px]">Lab U</th>
            </tr>
          </thead>
          <tbody>
            {groups.map((g) =>
              g.subjects.map((s, i) => (
                <tr
                  key={`${g.key}-${s.code}`}
                  className={`cursor-pointer transition-colors ${
                    activeCode === s.code ? "bg-emerald-100 ring-1 ring-emerald-400" : i % 2 === 0 ? "bg-white" : "bg-black/[0.02]"
                  } hover:bg-amber-50/80`}
                  onClick={() => pick(s.code)}
                >
                  {i === 0 ? (
                    <td
                      rowSpan={g.subjects.length}
                      className="border border-black/10 px-2 py-1.5 align-top font-semibold text-black/80 whitespace-nowrap bg-black/[0.03]"
                    >
                      <div>Year {g.yearLevel}</div>
                      <div className="text-[10px] font-normal text-black/60">{g.semester === 1 ? "1st sem" : "2nd sem"}</div>
                    </td>
                  ) : null}
                  <td className="border border-black/10 px-2 py-1.5 font-mono font-semibold text-[#780301]">{s.code}</td>
                  <td className="border border-black/10 px-2 py-1.5 text-black/85">{s.title}</td>
                  <td className="border border-black/10 px-2 py-1.5 text-right tabular-nums">{s.lecUnits}</td>
                  <td className="border border-black/10 px-2 py-1.5 text-right tabular-nums">{s.labUnits}</td>
                </tr>
              )),
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
