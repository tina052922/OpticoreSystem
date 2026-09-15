"use client";

import { useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { ChairmanPageHeader } from "@/components/ChairmanPageHeader";
import { NotifyGecReadyButton } from "@/components/college/NotifyGecReadyButton";
import { NotifyProgramPlottedButton } from "@/components/chairman/NotifyProgramPlottedButton";
import { BsitChairmanEvaluatorWorksheet } from "@/components/evaluator/BsitChairmanEvaluatorWorksheet";
import { CentralHubEvaluatorView } from "@/components/evaluator/CentralHubEvaluatorView";
import {
  ChairmanEvaluatorLoadPanel,
  type ChairmanPolicySnapshot,
} from "@/components/evaluator/ChairmanEvaluatorLoadPanel";
import { useSemesterFilter } from "@/contexts/SemesterFilterContext";
import { EVALUATOR_TAB_LABELS, evaluatorTabClass } from "@/lib/evaluator/evaluator-tabs";

export type EvaluatorPageProps = {
  /** Chairman / College Admin: week-grid plotter. DOI: same layout, view-only. CAS: Central Hub. GEC uses `GecCentralHubEvaluatorClient`. */
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

  if (variant === "cas" || showCollegeHub) {
    return (
      <div>
        <CentralHubEvaluatorView
          basePath={centralHubBasePath(variant === "college" ? "college" : variant)}
          showDoiGovernance={false}
          hubAccessMode={variant === "college" ? "collegeAdmin" : "default"}
        />
      </div>
    );
  }

  const collegeWide = variant === "college";
  const doiViewOnly = variant === "doi";

  return (
    <div>
      <ChairmanPageHeader title="Evaluator" />

      <div className="px-4 md:px-8 pb-8">
        <div className="flex flex-wrap items-center justify-between gap-3 mb-6">
          {/* Same order/labels as hub shells: Colleges → Timetabling → Hrs */}
          <div className="flex gap-2 border-b border-gray-200 flex-wrap">
            {collegeWide ? (
              <Link href="/admin/college/evaluator?hub=1" className={evaluatorTabClass(false)}>
                {EVALUATOR_TAB_LABELS.colleges}
              </Link>
            ) : null}
            <button
              type="button"
              onClick={() => setTab("timetabling")}
              className={evaluatorTabClass(tab === "timetabling")}
            >
              {EVALUATOR_TAB_LABELS.timetabling}
            </button>
            <button
              type="button"
              onClick={() => setTab("load")}
              className={evaluatorTabClass(tab === "load")}
            >
              {EVALUATOR_TAB_LABELS.hrs}
            </button>
          </div>
          {collegeWide ? (
            <NotifyGecReadyButton
              academicPeriodId={selectedPeriodId}
              periodLabel={selectedPeriod?.name ?? null}
            />
          ) : doiViewOnly ? null : (
            <NotifyProgramPlottedButton
              academicPeriodId={selectedPeriodId}
              periodLabel={selectedPeriod?.name ?? null}
              programId={chairmanProgramId}
              programLabel={chairmanProgramName || chairmanProgramCode}
            />
          )}
        </div>

        {collegeWide ? (
          <p className="text-[13px] text-black/65 mb-4">
            Same week-grid as Program Chairman. Choose a department, then plot any section in this college. Conflict
            check is campus-wide. Peer-college hubs remain view-only.
          </p>
        ) : null}
        {doiViewOnly ? (
          <p className="text-[13px] text-black/65 mb-4">
            Same Evaluator layout as College Admin. View-only: you cannot plot or edit. Use <strong>Run conflict
            check</strong> for a campus-wide scan. Formal publish stays on Schedule Hub.
          </p>
        ) : null}

        <div className={tab !== "timetabling" ? "hidden" : ""}>
          <BsitChairmanEvaluatorWorksheet
            chairmanCollegeId={chairmanCollegeId}
            chairmanProgramId={chairmanProgramId}
            chairmanProgramCode={chairmanProgramCode}
            chairmanProgramName={chairmanProgramName}
            collegeWidePrograms={collegeWide}
            campusWidePrograms={doiViewOnly}
            viewOnly={doiViewOnly}
            insFormBasePath={doiViewOnly ? "/doi/ins" : collegeWide ? "/admin/college/ins" : "/chairman/ins"}
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
