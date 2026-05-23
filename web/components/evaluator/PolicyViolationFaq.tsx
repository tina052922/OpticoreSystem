"use client";

import { useState } from "react";
import { POLICY_VIOLATION_FAQ } from "@/lib/evaluator/policy-violation-faq";

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
    </div>
  );
}
