import Link from "next/link";
import { HubCollegesNavLink } from "@/components/evaluator/HubCollegesNavLink";
import { EVALUATOR_TAB_LABELS, evaluatorTabClass } from "@/lib/evaluator/evaluator-tabs";

type Panel = "timetabling" | "hrs";

export type GecHubEvaluatorTabsProps = {
  collegeParam: string;
  panel: Panel;
};

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
      <HubCollegesNavLink basePath={base} className={evaluatorTabClass(collegesActive)}>
        {EVALUATOR_TAB_LABELS.colleges}
      </HubCollegesNavLink>
      {timetablingHref ? (
        <Link href={timetablingHref} className={evaluatorTabClass(timetablingActive)}>
          {EVALUATOR_TAB_LABELS.timetabling}
        </Link>
      ) : (
        <span className={`${evaluatorTabClass(false)} cursor-not-allowed opacity-50`}>
          {EVALUATOR_TAB_LABELS.timetabling}
        </span>
      )}
      {hrsHref ? (
        <Link href={hrsHref} className={evaluatorTabClass(hrsActive)}>
          {EVALUATOR_TAB_LABELS.hrs}
        </Link>
      ) : (
        <span className={`${evaluatorTabClass(false)} cursor-not-allowed opacity-50`}>
          {EVALUATOR_TAB_LABELS.hrs}
        </span>
      )}
    </div>
  );
}
