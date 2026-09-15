/**
 * Canonical Evaluator tab chrome — same labels and order for every role
 * (Chairman, College Admin, GEC, CAS, DOI).
 */

export const EVALUATOR_TAB_LABELS = {
  colleges: "Colleges",
  timetabling: "Timetabling & Optimization",
  hrs: "Hrs · Units · Preps · Remarks",
} as const;

/** Shared active/inactive tab button classes (hub + worksheet shells). */
export function evaluatorTabClass(active: boolean): string {
  return `px-6 py-3 font-medium transition-colors rounded-t-lg ${
    active ? "bg-[#FF990A] text-white" : "text-gray-600 hover:text-gray-800 bg-gray-100"
  }`;
}
