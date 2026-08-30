import Link from "next/link";
import { HubCollegesNavLink } from "@/components/evaluator/HubCollegesNavLink";

type Panel = "timetabling" | "hrs";

export type GecHubEvaluatorTabsProps = {
  collegeParam: string;
  panel: Panel;
};

const tabClass = (active: boolean) =>
  `px-6 py-3 font-medium transition-colors rounded-t-lg ${
    active ? "bg-[#FF990A] text-white" : "text-gray-600 hover:text-gray-800 bg-gray-100"
  }`;

export function GecHubEvaluatorTabs({ collegeParam, panel }: GecHubEvaluatorTabsProps) {
  const base = "/admin/gec/evaluator";
  const isLanding = !collegeParam;
  const collegesActive = isLanding;
  const timetablingActive = !isLanding && panel === "timetabling";
  const hrsActive = !isLanding && panel === "hrs";

  const timetablingHref = isLanding
    ? undefined
    : `${base}?college=${encodeURIComponent(collegeParam)}&panel=timetabling`;
  const hrsHref = isLanding ? undefined : `${base}?college=${encodeURIComponent(collegeParam)}&panel=hrs`;

  return (
    <div className="flex gap-2 border-b border-gray-200 mb-6 flex-wrap">
      <HubCollegesNavLink basePath={base} className={tabClass(collegesActive)}>
        Colleges
      </HubCollegesNavLink>
      {timetablingHref ? (
        <Link href={timetablingHref} className={tabClass(timetablingActive)}>
          Timetabling & Optimization
        </Link>
      ) : (
        <span className={`${tabClass(false)} cursor-not-allowed opacity-50`}>
          Timetabling & Optimization
        </span>
      )}
      {hrsHref ? (
        <Link href={hrsHref} className={tabClass(hrsActive)}>
          Hrs-Units-Preps-Remarks
        </Link>
      ) : (
        <span className={`${tabClass(false)} cursor-not-allowed opacity-50`}>Hrs-Units-Preps-Remarks</span>
      )}
    </div>
  );
}
