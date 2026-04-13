import Link from "next/link";
import { CAMPUS_WIDE_COLLEGE_SLUG } from "@/lib/evaluator-central-hub";

type Panel = "timetabling" | "hrs";

export type HubEvaluatorTabsProps = {
  basePath: string;
  /** `null` = landing (college tiles). */
  collegeSlug: string | null;
  panel: Panel;
};

/**
 * Tab bar shared by College / CAS / DOI Central Hub — matches Campus Intelligence shell styling.
 */
export function HubEvaluatorTabs({ basePath, collegeSlug, panel }: HubEvaluatorTabsProps) {
  const isLanding = !collegeSlug;
  const collegesActive = isLanding;
  const timetablingActive = !isLanding && panel === "timetabling";
  const hrsActive = !isLanding && panel === "hrs";

  const timetablingHref = isLanding
    ? `${basePath}?college=${CAMPUS_WIDE_COLLEGE_SLUG}`
    : `${basePath}?college=${encodeURIComponent(collegeSlug!)}`;

  const hrsHref = isLanding
    ? `${basePath}?college=${CAMPUS_WIDE_COLLEGE_SLUG}&panel=hrs`
    : `${basePath}?college=${encodeURIComponent(collegeSlug!)}&panel=hrs`;

  const tabClass = (active: boolean) =>
    `px-6 py-3 font-medium transition-colors rounded-t-lg ${
      active ? "bg-[#FF990A] text-white" : "text-gray-600 hover:text-gray-800 bg-gray-100"
    }`;

  return (
    <div className="flex gap-2 border-b border-gray-200 mb-6 flex-wrap">
      <Link href={basePath} className={tabClass(collegesActive)}>
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
