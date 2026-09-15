import Link from "next/link";
import { CAMPUS_WIDE_COLLEGE_SLUG } from "@/lib/evaluator-central-hub";
import { HubCollegesNavLink } from "@/components/evaluator/HubCollegesNavLink";
import { EVALUATOR_TAB_LABELS, evaluatorTabClass } from "@/lib/evaluator/evaluator-tabs";

type Panel = "timetabling" | "hrs";

export type HubEvaluatorTabsProps = {
  basePath: string;
  /** `null` = landing (college tiles). */
  collegeSlug: string | null;
  panel: Panel;
  collegeAdminLanding?: boolean;
};

export function HubEvaluatorTabs({ basePath, collegeSlug, panel, collegeAdminLanding = false }: HubEvaluatorTabsProps) {
  const isLanding = !collegeSlug;
  const collegesActive = isLanding && (!collegeAdminLanding || panel !== "hrs");
  const timetablingActive = !isLanding && panel === "timetabling";
  const hrsActive = (isLanding && collegeAdminLanding && panel === "hrs") || (!isLanding && panel === "hrs");

  const timetablingHref = isLanding
    ? undefined
    : `${basePath}?college=${encodeURIComponent(collegeSlug!)}&panel=timetabling`;

  const hrsHref = isLanding
    ? collegeAdminLanding
      ? `${basePath}?view=colleges&panel=hrs`
      : `${basePath}?college=${CAMPUS_WIDE_COLLEGE_SLUG}&panel=hrs`
    : `${basePath}?college=${encodeURIComponent(collegeSlug!)}&panel=hrs`;

  return (
    <div className="flex gap-2 border-b border-gray-200 mb-6 flex-wrap">
      <HubCollegesNavLink basePath={basePath} className={evaluatorTabClass(collegesActive)}>
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
      <Link href={hrsHref} className={evaluatorTabClass(hrsActive)}>
        {EVALUATOR_TAB_LABELS.hrs}
      </Link>
    </div>
  );
}
