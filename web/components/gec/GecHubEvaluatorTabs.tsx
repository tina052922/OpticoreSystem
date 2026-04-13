import Link from "next/link";
import { CAMPUS_WIDE_COLLEGE_SLUG } from "@/lib/evaluator-central-hub";

type Panel = "timetabling" | "hrs";

export type GecHubEvaluatorTabsProps = {
  /** Empty string = landing (college tiles). `all` = campus-wide workspace. Otherwise a `College.id` UUID. */
  collegeParam: string;
  panel: Panel;
};

const tabClass = (active: boolean) =>
  `px-6 py-3 font-medium transition-colors rounded-t-lg ${
    active ? "bg-[#FF990A] text-white" : "text-gray-600 hover:text-gray-800 bg-gray-100"
  }`;

/**
 * Same tab pattern as College Admin Central Hub (`HubEvaluatorTabs`), using DB college ids and `all` for campus-wide.
 */
export function GecHubEvaluatorTabs({ collegeParam, panel }: GecHubEvaluatorTabsProps) {
  const base = "/admin/gec/evaluator";
  const isLanding = !collegeParam;
  const collegesActive = isLanding;
  const timetablingActive = !isLanding && panel === "timetabling";
  const hrsActive = !isLanding && panel === "hrs";

  const timetablingHref = isLanding
    ? `${base}?college=${CAMPUS_WIDE_COLLEGE_SLUG}`
    : `${base}?college=${encodeURIComponent(collegeParam)}`;

  const hrsHref = isLanding
    ? `${base}?college=${CAMPUS_WIDE_COLLEGE_SLUG}&panel=hrs`
    : `${base}?college=${encodeURIComponent(collegeParam)}&panel=hrs`;

  return (
    <div className="flex gap-2 border-b border-gray-200 mb-6 flex-wrap">
      <Link href={base} className={tabClass(collegesActive)}>
        Colleges
      </Link>
      <Link href={timetablingHref} className={tabClass(timetablingActive)}>
        Timetabling & Optimization
      </Link>
      <Link href={hrsHref} className={tabClass(hrsActive)}>
        Hrs-Units-Preps-Remarks
      </Link>
    </div>
  );
}
