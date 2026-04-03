"use client";

import { useMemo, useState } from "react";
import { ChairmanPageHeader } from "@/components/ChairmanPageHeader";
import { BsitChairmanEvaluatorWorksheet } from "@/components/evaluator/BsitChairmanEvaluatorWorksheet";
import { CentralHubEvaluatorView } from "@/components/evaluator/CentralHubEvaluatorView";

type LoadRow = {
  faculty: string;
  hours: number;
  preps: number;
  units: number;
  designation: string;
  status: string;
  rate: number;
  remark: "Underloaded" | "Maximum" | "Overloaded";
};

const loadRows: LoadRow[] = [
  {
    faculty: "Juan Dela Cruz",
    hours: 10,
    preps: 3,
    units: 15,
    designation: "Instructor I",
    status: "Organic",
    rate: 250,
    remark: "Underloaded",
  },
  {
    faculty: "Ana Reyes",
    hours: 18,
    preps: 6,
    units: 24,
    designation: "Instructor (PT)",
    status: "Part-Time",
    rate: 200,
    remark: "Maximum",
  },
  {
    faculty: "Dr. Maria Santos",
    hours: 22,
    preps: 7,
    units: 30,
    designation: "Chair / Instructor",
    status: "Permanent",
    rate: 300,
    remark: "Overloaded",
  },
];

function remarkClass(r: LoadRow["remark"]) {
  if (r === "Underloaded") return "bg-green-100 text-green-900";
  if (r === "Maximum") return "bg-yellow-100 text-yellow-900";
  return "bg-red-100 text-red-900";
}

export type EvaluatorPageProps = {
  /** Chairman: full plotter. College / CAS / DOI: Central Hub (college tiles + hub table). */
  variant?: "chairman" | "college" | "cas" | "doi";
  /** Server-provided college scope for Chairman (no college picker; program filter only). */
  chairmanCollegeId?: string | null;
  /** Locked program for chairman (`getChairmanSession` defaults BSIT for CTE when DB column unset). */
  chairmanProgramId?: string | null;
};

function centralHubBasePath(variant: "college" | "cas" | "doi"): string {
  if (variant === "college") return "/admin/college/evaluator";
  if (variant === "cas") return "/admin/cas/evaluator";
  return "/doi/evaluator";
}

export function EvaluatorPage({
  variant = "chairman",
  chairmanCollegeId = null,
  chairmanProgramId = null,
}: EvaluatorPageProps) {
  if (variant === "college" || variant === "cas" || variant === "doi") {
    return <CentralHubEvaluatorView basePath={centralHubBasePath(variant)} />;
  }

  const [tab, setTab] = useState<"timetabling" | "load">("timetabling");

  const tabLabel = useMemo(() => {
    if (tab === "timetabling") return "Timetabling & optimization — schedule grid and plotting tools";
    return "Hours, units, preps, and remarks (sample institutional summary)";
  }, [tab]);

  const subtitle =
    "BSIT timetable planning — Mon–Fri, 7:00 AM–5:00 PM. Add rows, plot conflicts, preview INS grid, justify overloads for DOI.";

  return (
    <div>
      <ChairmanPageHeader title="Evaluator" subtitle={subtitle} />

      <div className="px-4 md:px-8 pb-8">
        <div className="flex flex-wrap items-center justify-between gap-3 mb-6">
          <div className="flex gap-2 flex-wrap">
            {[
              { id: "timetabling" as const, label: "Timetabling & Optimization" },
              { id: "load" as const, label: "Hrs-Units-Preps-Remarks" },
            ].map((t) => (
              <button
                key={t.id}
                type="button"
                onClick={() => setTab(t.id)}
                className={`h-10 px-4 rounded-[15px] font-bold text-[14px] ${
                  tab === t.id ? "bg-[#ff990a] text-white" : "bg-white text-black border border-black/10"
                }`}
              >
                {t.label}
              </button>
            ))}
          </div>
        </div>

        <p className="text-[13px] text-black/55 mb-4">{tabLabel}</p>

        {tab === "timetabling" ? (
          <BsitChairmanEvaluatorWorksheet chairmanCollegeId={chairmanCollegeId} chairmanProgramId={chairmanProgramId} />
        ) : null}

        {tab === "load" ? (
          <div className="bg-white rounded-xl shadow-[0px_4px_4px_rgba(0,0,0,0.12)] overflow-hidden">
            <div className="p-4 border-b border-black/10">
              <div className="text-[16px] font-semibold">Faculty Load & Preps</div>
              <div className="text-[12px] text-black/60 mt-1">Remarks align with institutional load policy (sample rows).</div>
            </div>
            <div className="overflow-auto">
              <table className="w-full border-collapse">
                <thead>
                  <tr className="bg-[#ff990a] text-white text-[11px]">
                    <th className="border border-black/10 px-2 py-2 text-left">Faculty Name</th>
                    <th className="border border-black/10 px-2 py-2 text-left">Hours/Week</th>
                    <th className="border border-black/10 px-2 py-2 text-left">Preps</th>
                    <th className="border border-black/10 px-2 py-2 text-left">Units</th>
                    <th className="border border-black/10 px-2 py-2 text-left">Designation</th>
                    <th className="border border-black/10 px-2 py-2 text-left">Status</th>
                    <th className="border border-black/10 px-2 py-2 text-left">Rate per Hour</th>
                    <th className="border border-black/10 px-2 py-2 text-left">Remarks</th>
                  </tr>
                </thead>
                <tbody>
                  {loadRows.map((r) => (
                    <tr key={r.faculty} className="text-[11px]">
                      <td className="border border-black/10 px-2 py-2 font-semibold">{r.faculty}</td>
                      <td className="border border-black/10 px-2 py-2">{r.hours}</td>
                      <td className="border border-black/10 px-2 py-2">{r.preps}</td>
                      <td className="border border-black/10 px-2 py-2">{r.units}</td>
                      <td className="border border-black/10 px-2 py-2">{r.designation}</td>
                      <td className="border border-black/10 px-2 py-2">{r.status}</td>
                      <td className="border border-black/10 px-2 py-2">₱{r.rate}</td>
                      <td className="border border-black/10 px-2 py-2">
                        <span className={`px-2 py-1 rounded-md font-semibold ${remarkClass(r.remark)}`}>{r.remark}</span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        ) : null}
      </div>
    </div>
  );
}
