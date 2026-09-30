"use client";

import { useState } from "react";
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
  /** Chairman / College Admin: week-grid plotter. DOI: campus-wide plotter. CAS: Central Hub. GEC uses `GecCentralHubEvaluatorClient`. */
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
  const doiCampusWide = variant === "doi";
  /**
   * College Admin reads teaching load on its own page, not as a tab here.
   *
   * The same numbers are on /admin/college/teaching-load-summary, which is the printable form, so a
   * second copy behind a tab was two places to look and two places to disagree.
   */
  const showLoadTab = !collegeWide;
  // A tab that is not rendered must not stay selected from an earlier render.
  const activeTab = showLoadTab ? tab : "timetabling";
  /**
   * One tab is not a choice, so the strip only earns its space when something can be switched.
   *
   * For College Admin nothing can: the Colleges tab is gone (they plot their own college and have no
   * other to switch to) and so is the load tab, which leaves Timetabling alone.
   */
  const showTabStrip = showLoadTab;

  return (
    <div>
      <ChairmanPageHeader title="Evaluator" />

      <div className="px-4 md:px-8 pb-8">
        <div className="flex flex-wrap items-center justify-between gap-3 mb-6">
          {/* Same order/labels as the hub shells: Timetabling → Hrs */}
          {showTabStrip ? (
            <div className="flex gap-2 border-b border-gray-200 flex-wrap">
              <button
                type="button"
                onClick={() => setTab("timetabling")}
                className={evaluatorTabClass(activeTab === "timetabling")}
              >
                {EVALUATOR_TAB_LABELS.timetabling}
              </button>
              {showLoadTab ? (
                <button
                  type="button"
                  onClick={() => setTab("load")}
                  className={evaluatorTabClass(activeTab === "load")}
                >
                  {EVALUATOR_TAB_LABELS.hrs}
                </button>
              ) : null}
            </div>
          ) : null}
          {collegeWide ? (
            // Keeps the action on the right now that no tab strip sits beside it.
            <div className="ml-auto">
              <NotifyGecReadyButton
                academicPeriodId={selectedPeriodId}
                periodLabel={selectedPeriod?.name ?? null}
              />
            </div>
          ) : doiCampusWide ? null : (
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
            check is campus-wide.
          </p>
        ) : null}
        {doiCampusWide ? (
          <p className="text-[13px] text-black/65 mb-4">
            Campus-wide Evaluator: plot and edit any department. Use conflict check before formal publish on Schedule
            Hub.
          </p>
        ) : null}

        <div className={activeTab !== "timetabling" ? "hidden" : ""}>
          <BsitChairmanEvaluatorWorksheet
            chairmanCollegeId={chairmanCollegeId}
            chairmanProgramId={chairmanProgramId}
            chairmanProgramCode={chairmanProgramCode}
            chairmanProgramName={chairmanProgramName}
            collegeWidePrograms={collegeWide}
            campusWidePrograms={doiCampusWide}
            viewOnly={false}
            insFormBasePath={doiCampusWide ? "/doi/ins" : collegeWide ? "/admin/college/ins" : "/chairman/ins"}
            onPolicySnapshot={setPolicySnapshot}
          />
        </div>

        {showLoadTab ? (
          <div className={activeTab !== "load" ? "hidden" : ""}>
            <ChairmanEvaluatorLoadPanel snapshot={policySnapshot} />
          </div>
        ) : null}
      </div>
    </div>
  );
}
