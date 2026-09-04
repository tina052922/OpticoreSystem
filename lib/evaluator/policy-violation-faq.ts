/** Shared FAQ copy for policy / load violations (evaluator + policy review pages). */

import { DESIGNATION_POLICIES } from "@/lib/faculty/designation-system";

export const POLICY_VIOLATION_FAQ = [
  {
    q: "Why did I get a teaching load violation?",
    a: "Weekly contact hours for an instructor exceeded the cap for their employment status (resident vs non-resident) or designation teaching load range from the faculty merit system.",
  },
  {
    q: "Does a violation block saving?",
    a: "No. The plotted schedule still saves when hours or preparations exceed policy. You are asked for a written justification so DOI is notified and the reason is recorded on Summary of Teaching Load and the instructor’s Faculty Profile.",
  },
  {
    q: "What happens after I submit justification?",
    a: "College Admin and DOI are notified. The text is stored as a record only — there is no accept/reject step.",
  },
  {
    q: "Why do conflicts and policy checks differ?",
    a: "Run conflict check scans the whole campus for room, faculty, and section overlaps. Policy checks focus on faculty load rules for plotted instructors.",
  },
  {
    q: "What are faculty designations and how do they affect load?",
    a: "Designations (Dean, Chairperson, Campus Director, etc.) set a weekly teaching-hour cap from the CTU Faculty Merit System. Regular faculty without a designation use the campus standard load (resident / non-resident rules). Violations appear when plotted hours exceed the designation cap or employment status limit.",
  },
  {
    q: "How will I know an instructor is about to become overloaded while plotting?",
    a: "The instructor picker shows a running total (hours plotted so far / maximum hours per week). It turns amber when the instructor is close to their cap, and red once the assignment being plotted would push them over — before you even save.",
  },
  {
    q: "What is the maximum weekly load for a non-resident instructor?",
    a: "Non-resident instructors are capped separately from resident faculty, using the campus-wide value from the CTU Faculty Manual policy defaults. Plotting beyond this cap still saves; a justification for DOI is requested so the overload is recorded.",
  },
  {
    q: "Who receives overload justifications and what counts as valid?",
    a: "DOI is the submit target (College Admin is also notified). A valid justification explains why the overload is necessary (e.g., lack of available instructors) — at least 12 characters. It is a record only; DOI does not accept or reject it.",
  },
  {
    q: "How is rate per hour determined?",
    a: "Rate per hour comes from the instructor's highest degree (Doctorate, Master's, Baccalaureate) using the Faculty Merit System rates. It is shown on the Faculty Profile alongside the designation teaching load.",
  },
] as const;


/** Reference table for admins reviewing policy violations. */
export const FACULTY_DESIGNATION_REFERENCE = DESIGNATION_POLICIES.map((p) => ({
  designation: p.label,
  hoursPerWeek: `${p.hoursPerWeekMin}–${p.hoursPerWeekMax} hrs/week`,
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
