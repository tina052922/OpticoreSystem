/** Shared FAQ copy for policy / load violations (evaluator + policy review pages). */

import { DESIGNATION_POLICIES } from "@/lib/faculty/designation-system";

export const POLICY_VIOLATION_FAQ = [
  {
    q: "Why did I get a teaching load violation?",
    a: "Weekly contact hours for an instructor exceeded the cap for their employment status (organic vs part-time) or designation teaching load range from the faculty merit system.",
  },
  {
    q: "Does a violation block saving?",
    a: "You can keep plotting, but Save and certain assignments require a written justification so DOI / VPAA can review the overload in Policy Reviews.",
  },
  {
    q: "What happens after I submit justification?",
    a: "College Admin and DOI see the submission. VPAA accepts or rejects it; accepted overloads remain on record for the term.",
  },
  {
    q: "Why do conflicts and policy checks differ?",
    a: "Run conflict check scans the whole campus for room, faculty, and section overlaps. Policy checks focus on faculty load rules for plotted instructors.",
  },
  {
    q: "What are faculty designations and how do they affect load?",
    a: "Designations (Dean, Chairperson, Campus Director, etc.) set a weekly teaching-hour cap from the CTU Faculty Merit System. Regular faculty without a designation use the campus standard load (organic / part-time rules). Violations appear when plotted hours exceed the designation cap or employment status limit.",
  },
] as const;

/** Reference table for admins reviewing policy violations. */
export const FACULTY_DESIGNATION_REFERENCE = DESIGNATION_POLICIES.map((p) => ({
  designation: p.label,
  hoursPerWeek: `${p.hoursPerWeekMin}–${p.hoursPerWeekMax} hrs/week`,
  note:
    p.key === "Regular Faculty"
      ? "Uses standard organic / part-time caps when no other designation applies."
      : "Scheduling enforces the upper bound; overload requires justification.",
}));

export const PLOTTING_GUIDANCE_CARDS = [
  {
    title: "Plot in order",
    body: "Pick section → subject from the prospectus → instructor (Employee ID) → room → day and time slot.",
  },
  {
    title: "Split lecture or lab hours",
    body: "Use Duration (hours per meeting) = 1 to plot the same subject on different days or times. Add another row for the same subject code until weekly contact hours are complete.",
  },
  {
    title: "Faculty first",
    body: "Add instructors in Faculty Profile with Employee ID before plotting so schedules link when they self-register.",
  },
  {
    title: "Save often",
    body: "Draft rows autosync; use Save schedule after major edits. Run conflict check (campus-wide) before publishing.",
  },
] as const;
