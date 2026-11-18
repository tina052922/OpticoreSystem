"use client";

import { useRouter } from "next/navigation";

export const CAS_GENERAL_SUBJECTS_SCHEDULER_PATH = "/admin/college/evaluator/general";
const CAS_SUBJECTS_SCHEDULER_PATH = "/admin/college/evaluator";

/**
 * CAS College Admin, Subject Scheduler: what to plot — CAS's own program subjects, or general
 * subjects into vacant slots of every college (what the Service Chairs do). Switch back and forth.
 */
export function CasPlottingScopeSelect({ active }: { active: "cas" | "general" }) {
  const router = useRouter();
  return (
    <label className="flex items-center gap-2 text-[13px] font-semibold text-black/70">
      Plotting
      <select
        aria-label="What to plot"
        className="h-10 rounded-lg border border-[#780301]/30 bg-white px-3 text-sm font-medium text-[#780301] shadow-sm outline-none focus-visible:ring-2 focus-visible:ring-[#ff990a]/40"
        value={active}
        onChange={(e) =>
          router.push(e.target.value === "general" ? CAS_GENERAL_SUBJECTS_SCHEDULER_PATH : CAS_SUBJECTS_SCHEDULER_PATH)
        }
      >
        <option value="cas">CAS subjects (own programs)</option>
        <option value="general">General subjects (all colleges)</option>
      </select>
    </label>
  );
}
