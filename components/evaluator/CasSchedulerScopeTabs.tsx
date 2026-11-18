import Link from "next/link";

export const CAS_GENERAL_SUBJECTS_SCHEDULER_PATH = "/admin/college/evaluator/general";

/**
 * CAS College Admin's Subject Scheduler has two views: their own college's sections, and general
 * subjects plotted into vacant slots of every college (what the Service Chairs do).
 */
export function CasSchedulerScopeTabs({ active }: { active: "college" | "general" }) {
  const tab = (on: boolean) =>
    `rounded-lg px-4 py-2 text-sm font-semibold transition-colors ${
      on
        ? "bg-[#780301] text-white shadow-sm"
        : "bg-white text-[#780301] border border-[#780301]/25 hover:border-[#ff990a]"
    }`;
  return (
    <div className="px-4 sm:px-6 lg:px-8 pt-4 flex flex-wrap gap-2" role="tablist" aria-label="Scheduler view">
      <Link href="/admin/college/evaluator" role="tab" aria-selected={active === "college"} className={tab(active === "college")}>
        College sections
      </Link>
      <Link
        href={CAS_GENERAL_SUBJECTS_SCHEDULER_PATH}
        role="tab"
        aria-selected={active === "general"}
        className={tab(active === "general")}
      >
        General subjects · all colleges
      </Link>
    </div>
  );
}
