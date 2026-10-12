import Link from "next/link";
import { HubCollegesNavLink } from "@/components/evaluator/HubCollegesNavLink";
import { EVALUATOR_TAB_LABELS, evaluatorTabClass } from "@/lib/evaluator/evaluator-tabs";

/** Mirror of {@link HubEvaluatorTabs} for the GEC route, which builds its own hrefs. */
type Panel = "timetabling";

export type GecHubEvaluatorTabsProps = {
  collegeParam: string;
  panel?: Panel;
};

export function GecHubEvaluatorTabs({ collegeParam }: GecHubEvaluatorTabsProps) {
  const base = "/admin/gec/evaluator";
  const isLanding = !collegeParam;
  const timetablingHref = isLanding
    ? undefined
    : `${base}?college=${encodeURIComponent(collegeParam)}&panel=timetabling`;

  return (
    <div className="flex gap-2 border-b border-gray-200 mb-6 flex-wrap">
      <HubCollegesNavLink basePath={base} className={evaluatorTabClass(isLanding)}>
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
