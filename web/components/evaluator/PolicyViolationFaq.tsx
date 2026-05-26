"use client";

import { useState } from "react";
import { FACULTY_DESIGNATION_REFERENCE, POLICY_VIOLATION_FAQ } from "@/lib/evaluator/policy-violation-faq";

export function PolicyViolationFaq({ className = "" }: { className?: string }) {
  const [openIdx, setOpenIdx] = useState<number | null>(0);

  return (
    <div className={`rounded-xl border border-amber-200/80 bg-amber-50/40 p-4 space-y-2 ${className}`}>
      <p className="text-[13px] font-bold text-amber-950">Policy violations — quick answers</p>
      <ul className="space-y-1">
        {POLICY_VIOLATION_FAQ.map((item, i) => {
          const open = openIdx === i;
          return (
            <li key={item.q} className="rounded-lg border border-amber-200/60 bg-white overflow-hidden">
              <button
                type="button"
                className="w-full text-left px-3 py-2 text-[12px] font-semibold text-amber-950 hover:bg-amber-50/80"
                onClick={() => setOpenIdx(open ? null : i)}
                aria-expanded={open}
              >
                {open ? "− " : "+ "}
                {item.q}
              </button>
              {open ? <p className="px-3 pb-2.5 text-[12px] text-black/70 leading-relaxed">{item.a}</p> : null}
            </li>
          );
        })}
      </ul>

      <div className="pt-2 border-t border-amber-200/70">
        <p className="text-[12px] font-bold text-amber-950 mb-2">Faculty ranks & designation teaching caps</p>
        <div className="overflow-x-auto rounded-lg border border-amber-200/60 bg-white">
          <table className="w-full text-[11px]">
            <thead>
              <tr className="bg-amber-50/80 text-left">
                <th className="px-2 py-1.5 font-semibold">Designation</th>
                <th className="px-2 py-1.5 font-semibold">Teaching load</th>
                <th className="px-2 py-1.5 font-semibold hidden sm:table-cell">Notes</th>
              </tr>
            </thead>
            <tbody>
              {FACULTY_DESIGNATION_REFERENCE.map((row) => (
                <tr key={row.designation} className="border-t border-amber-100/80">
                  <td className="px-2 py-1.5 font-medium text-black/85">{row.designation}</td>
                  <td className="px-2 py-1.5 tabular-nums text-black/75">{row.hoursPerWeek}</td>
                  <td className="px-2 py-1.5 text-black/60 hidden sm:table-cell">{row.note}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
