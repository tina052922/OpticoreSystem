/** Shared FAQ copy for policy / load violations (evaluator + policy review pages). */

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
] as const;

export const PLOTTING_GUIDANCE_CARDS = [
  {
    title: "Plot in order",
    body: "Pick section → subject from the prospectus → instructor (Employee ID) → room → day and time slot.",
  },
  {
    title: "One row per meeting",
    body: "Multi-hour subjects span consecutive slots in the preview grid; lab/lec units drive duration.",
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
