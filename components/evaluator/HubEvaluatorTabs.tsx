import Link from "next/link";
import { hubHref } from "@/lib/evaluator-central-hub";
import { HubCollegesNavLink } from "@/components/evaluator/HubCollegesNavLink";
import { EVALUATOR_TAB_LABELS, evaluatorTabClass } from "@/lib/evaluator/evaluator-tabs";

/**
 * The Subject Scheduler's tabs: pick a college, then plot it.
 *
 * There was a third, "Hrs · Units · Preps · Remarks". It has been removed — those totals are the
 * Summary of Teaching Load's job, which has its own page in the sidebar, and keeping a second copy
 * behind a tab meant two places to read the same numbers and two places for them to disagree.
 */
type Panel = "timetabling";

export type HubEvaluatorTabsProps = {
  basePath: string;
  /** `null` = landing (college tiles). */
  collegeSlug: string | null;
  panel?: Panel;
};

export function HubEvaluatorTabs({ basePath, collegeSlug }: HubEvaluatorTabsProps) {
  const isLanding = !collegeSlug;
  const timetablingHref = isLanding
    ? undefined
    : hubHref(basePath, { college: collegeSlug!, panel: "timetabling" });

  return (
    <div className="flex gap-2 border-b border-gray-200 mb-6 flex-wrap">
      <HubCollegesNavLink basePath={basePath} className={evaluatorTabClass(isLanding)}>
        {EVALUATOR_TAB_LABELS.colleges}
      </HubCollegesNavLink>
      {timetablingHref ? (
        <Link href={timetablingHref} className={evaluatorTabClass(!isLanding)}>
          {EVALUATOR_TAB_LABELS.timetabling}
        </Link>
      ) : (
        <span className={`${evaluatorTabClass(false)} cursor-not-allowed opacity-50`}>
          {EVALUATOR_TAB_LABELS.timetabling}
        </span>
      )}
    </div>
  );
}
