/**
 * Canonical Subject Scheduler tab chrome — same labels and order for every role
 * (Chairman, College Admin, GEC, CAS, DOI).
 *
 * There was a third tab, "Hrs · Units · Preps · Remarks". Those totals belong to the Summary of
 * Teaching Load, which has its own page; a copy behind a tab here was a second place to read the
 * same numbers and a second place for them to disagree.
 */

export const EVALUATOR_TAB_LABELS = {
  colleges: "Colleges",
  timetabling: "Timetabling & Optimization",
} as const;

/** Shared active/inactive tab button classes (hub + worksheet shells). */
export function evaluatorTabClass(active: boolean): string {
  return `px-6 py-3 font-medium transition-colors rounded-t-lg ${
    active ? "bg-[#FF990A] text-white" : "text-gray-600 hover:text-gray-800 bg-gray-100"
  }`;
}
