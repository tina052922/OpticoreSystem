import Link from "next/link";
import { CAMPUS_WIDE_COLLEGE_SLUG } from "@/lib/evaluator-central-hub";
import { HubCollegesNavLink } from "@/components/evaluator/HubCollegesNavLink";

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

  const tabClass = (active: boolean) =>
    `px-6 py-3 font-medium transition-colors rounded-t-lg ${
      active ? "bg-[#FF990A] text-white" : "text-gray-600 hover:text-gray-800 bg-gray-100"
    }`;

  return (
    <div className="flex gap-2 border-b border-gray-200 mb-6 flex-wrap">
      <HubCollegesNavLink basePath={basePath} className={tabClass(collegesActive)}>
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
      <Link href={hrsHref} className={tabClass(hrsActive)}>
        Hrs · Units · Preps · Remarks
      </Link>
    </div>
  );
}
