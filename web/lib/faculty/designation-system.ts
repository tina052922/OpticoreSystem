import type { FacultyProfile } from "@/types/db";

/**
 * CTU Faculty Merit System (rates + designated teaching loads).
 * This module centralizes designation and rate logic so Faculty Profile, Evaluator, and policy checks stay aligned.
 */

export type DesignationKey =
  | "University Director"
  | "Campus Director"
  | "Assistant Campus Director"
  | "Dean of Instruction"
  | "College Dean"
  | "Associate College Dean"
  | "Department Chairperson"
  | "College Secretary"
  | "Faculty Regent"
  | "Campus Faculty President"
  | "Regular Faculty";

export type DesignationPolicy = {
  key: DesignationKey;
  /** Stored label in `FacultyProfile.designation` (human-readable). */
  label: string;
  /** Teaching hours per week range from the Merit System. */
  hoursPerWeekMin: number;
  hoursPerWeekMax: number;
};

export const DESIGNATION_POLICIES: DesignationPolicy[] = [
  { key: "University Director", label: "University Director", hoursPerWeekMin: 3, hoursPerWeekMax: 6 },
  { key: "Campus Director", label: "Campus Director", hoursPerWeekMin: 3, hoursPerWeekMax: 6 },
  { key: "Assistant Campus Director", label: "Assistant Campus Director", hoursPerWeekMin: 6, hoursPerWeekMax: 9 },
  { key: "Dean of Instruction", label: "Dean of Instruction", hoursPerWeekMin: 6, hoursPerWeekMax: 9 },
  { key: "College Dean", label: "College Dean", hoursPerWeekMin: 6, hoursPerWeekMax: 9 },
  { key: "Associate College Dean", label: "Associate College Dean", hoursPerWeekMin: 9, hoursPerWeekMax: 12 },
  { key: "Department Chairperson", label: "Department Chairperson", hoursPerWeekMin: 12, hoursPerWeekMax: 15 },
  { key: "College Secretary", label: "College Secretary", hoursPerWeekMin: 12, hoursPerWeekMax: 15 },
  { key: "Faculty Regent", label: "Faculty Regent", hoursPerWeekMin: 6, hoursPerWeekMax: 9 },
  { key: "Campus Faculty President", label: "Campus Faculty President", hoursPerWeekMin: 12, hoursPerWeekMax: 15 },
  /**
   * For scheduling we enforce the *upper bound* and handle overload justification separately.
   * Prep-based reductions can be layered on later.
   */
  { key: "Regular Faculty", label: "Regular Faculty (no designation)", hoursPerWeekMin: 18, hoursPerWeekMax: 24 },
];

export function getDesignationPolicyByLabel(
  designation: string | null | undefined,
): DesignationPolicy | null {
  const d = (designation ?? "").trim();
  if (!d) return null;
  return DESIGNATION_POLICIES.find((p) => p.label === d) ?? null;
}

/**
 * Scheduling uses a single numeric cap (hours/week). We use the upper bound of the designation range.
 * For regular faculty without designation, return null so callers can fall back to standard caps.
 */
export function designationTeachingCapHours(designation: string | null | undefined): number | null {
  const p = getDesignationPolicyByLabel(designation);
  if (!p) return null;
  if (p.key === "Regular Faculty") return null;
  return p.hoursPerWeekMax;
}

export type HighestDegree = "Doctorate" | "Master’s" | "Baccalaureate" | null;

export function highestDegree(profile: Pick<
  FacultyProfile,
  "doctoralDegree" | "msDegree" | "bsDegree"
> | null): HighestDegree {
  if (!profile) return null;
  if ((profile.doctoralDegree ?? "").trim()) return "Doctorate";
  if ((profile.msDegree ?? "").trim()) return "Master’s";
  if ((profile.bsDegree ?? "").trim()) return "Baccalaureate";
  return null;
}

export function ratePerHourFromHighestDegree(d: HighestDegree): number | null {
  if (d === "Doctorate") return 250;
  if (d === "Master’s") return 225;
  if (d === "Baccalaureate") return 200;
  return null;
}

/**
 * Canonical hourly rate (undergraduate) derived from the highest degree fields in `FacultyProfile`.
 * Stored in DB in `FacultyProfile.ratePerHour` for consistent evaluator rendering.
 */
export function computeRatePerHour(profile: Pick<
  FacultyProfile,
  "doctoralDegree" | "msDegree" | "bsDegree"
> | null): number | null {
  return ratePerHourFromHighestDegree(highestDegree(profile));
}

