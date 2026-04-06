"use client";

import { useMemo, useState } from "react";
import { ChairmanPageHeader } from "@/components/ChairmanPageHeader";
import { BsitChairmanEvaluatorWorksheet } from "@/components/evaluator/BsitChairmanEvaluatorWorksheet";
import { CentralHubEvaluatorView } from "@/components/evaluator/CentralHubEvaluatorView";
import {
  ChairmanEvaluatorLoadPanel,
  type ChairmanPolicySnapshot,
} from "@/components/evaluator/ChairmanEvaluatorLoadPanel";

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
  const [policySnapshot, setPolicySnapshot] = useState<ChairmanPolicySnapshot | null>(null);

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

        <div className={tab !== "timetabling" ? "hidden" : ""}>
          <BsitChairmanEvaluatorWorksheet
            chairmanCollegeId={chairmanCollegeId}
            chairmanProgramId={chairmanProgramId}
            onPolicySnapshot={setPolicySnapshot}
          />
        </div>

        <div className={tab !== "load" ? "hidden" : ""}>
          <ChairmanEvaluatorLoadPanel snapshot={policySnapshot} />
        </div>
      </div>
    </div>
  );
}
