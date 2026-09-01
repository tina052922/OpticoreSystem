"use client";

import { useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { ChairmanPageHeader } from "@/components/ChairmanPageHeader";
import { NotifyGecReadyButton } from "@/components/college/NotifyGecReadyButton";
import { BsitChairmanEvaluatorWorksheet } from "@/components/evaluator/BsitChairmanEvaluatorWorksheet";
import { CentralHubEvaluatorView } from "@/components/evaluator/CentralHubEvaluatorView";
import {
  ChairmanEvaluatorLoadPanel,
  type ChairmanPolicySnapshot,
} from "@/components/evaluator/ChairmanEvaluatorLoadPanel";
import { useSemesterFilter } from "@/contexts/SemesterFilterContext";

export type EvaluatorPageProps = {
  /** Chairman: program plotter. College: same plotter, college-wide. CAS / DOI: Central Hub. GEC uses `GecCentralHubEvaluatorClient`. */
  variant?: "chairman" | "college" | "cas" | "doi";
  /** Server-provided college scope for Chairman / College Admin. */
  chairmanCollegeId?: string | null;
  /** Locked program for chairman (`getChairmanSession` defaults BSIT for CTE when DB column unset). */
  chairmanProgramId?: string | null;
  chairmanProgramCode?: string | null;
  chairmanProgramName?: string | null;
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
  chairmanProgramCode = null,
  chairmanProgramName = null,
}: EvaluatorPageProps) {
  const [tab, setTab] = useState<"timetabling" | "load">("timetabling");
  const [policySnapshot, setPolicySnapshot] = useState<ChairmanPolicySnapshot | null>(null);
  const searchParams = useSearchParams();
  const { selectedPeriodId, selectedPeriod } = useSemesterFilter();
  const showCollegeHub = variant === "college" && searchParams.get("hub") === "1";

  if (variant === "cas" || variant === "doi" || showCollegeHub) {
    return (
      <CentralHubEvaluatorView
        basePath={centralHubBasePath(variant === "college" ? "college" : variant)}
        showDoiGovernance={variant === "doi"}
        hubAccessMode={variant === "college" ? "collegeAdmin" : "default"}
      />
    );
  }

  const collegeWide = variant === "college";

  return (
    <div>
      <ChairmanPageHeader title="Evaluator" />

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
            {collegeWide ? (
              <Link
                href="/admin/college/evaluator?hub=1"
                className="h-10 px-4 rounded-[15px] font-bold text-[14px] bg-white text-black border border-black/10 inline-flex items-center"
              >
                College hub
              </Link>
            ) : null}
          </div>
          {collegeWide ? (
            <NotifyGecReadyButton
              academicPeriodId={selectedPeriodId}
              periodLabel={selectedPeriod?.name ?? null}
            />
          ) : null}
        </div>

        {collegeWide ? (
          <p className="text-[13px] text-black/65 mb-4">
            Same week-grid as Program Chairman. Choose a department, then plot any section in this college. Conflict
            check is campus-wide. Peer-college hubs remain view-only.
          </p>
        ) : null}

        <div className={tab !== "timetabling" ? "hidden" : ""}>
          <BsitChairmanEvaluatorWorksheet
            chairmanCollegeId={chairmanCollegeId}
            chairmanProgramId={chairmanProgramId}
            chairmanProgramCode={chairmanProgramCode}
            chairmanProgramName={chairmanProgramName}
            collegeWidePrograms={collegeWide}
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
