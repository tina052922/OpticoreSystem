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

/**
 * Designation is typed free-form in Faculty Profile, so match case- and spacing-insensitively —
 * otherwise "college dean" would silently fall back to the standard load instead of the 9 h cap.
 * Mirrors the backend lookup in `faculty-load-policy.ts`.
 */
export function getDesignationPolicyByLabel(
  designation: string | null | undefined,
): DesignationPolicy | null {
  const d = (designation ?? "").trim().replace(/\s+/g, " ").toLowerCase();
  if (!d) return null;
  return DESIGNATION_POLICIES.find((p) => p.label.toLowerCase() === d) ?? null;
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

const DOCTORATE_PATTERN = /\b(doctor\w*|ph\.?\s?d|ed\.?\s?d|d\.?\s?sc|dit|dba|dpa|dm)\b/i;
const MASTERS_PATTERN = /\b(master\w*|m\.?\s?s|m\.?\s?a|m\.?\s?ed|maed|mba|mit|msit|mpa|mph|llm)\b/i;
const BACCALAUREATE_PATTERN = /\b(bachelor\w*|b\.?\s?s|b\.?\s?a|ab|bsed|bse|bsit|bsba)\b/i;

/**
 * Degree tier read off the HR Form 23B "EDUCATIONAL QUALIFICATION" cell, which is free text:
 * "Doctor of Philosophy in IT", "MS Information Technology", "BS Computer Science".
 * Null when the text names no recognizable degree — the caller then has no rate rather than a wrong one.
 */
export function degreeTierFromEducationalQualification(
  educationalQualification: string | null | undefined,
): HighestDegree {
  const text = (educationalQualification ?? "").trim();
  if (!text) return null;
  if (DOCTORATE_PATTERN.test(text)) return "Doctorate";
  if (MASTERS_PATTERN.test(text)) return "Master’s";
  if (BACCALAUREATE_PATTERN.test(text)) return "Baccalaureate";
  return null;
}

/**
 * Highest degree for the rate.
 *
 * `educationalQualification` wins: it is the cell the Faculty Profile page maintains (HR Form 23B).
 * The separate BS/MS/doctoral columns remain only as the fallback for profiles that predate the form
 * or were filled in by instructor self-registration.
 */
export function highestDegree(
  profile:
    | (Pick<FacultyProfile, "doctoralDegree" | "msDegree" | "bsDegree"> & {
        educationalQualification?: string | null;
      })
    | null,
): HighestDegree {
  if (!profile) return null;
  const fromForm = degreeTierFromEducationalQualification(profile.educationalQualification);
  if (fromForm) return fromForm;
  if ((profile.doctoralDegree ?? "").trim()) return "Doctorate";
  if ((profile.msDegree ?? "").trim()) return "Master’s";
  if ((profile.bsDegree ?? "").trim()) return "Baccalaureate";
  return null;
}

export type HourlyRateOverrides = {
  doctorate?: number;
  masters?: number;
  baccalaureate?: number;
};

export function ratePerHourFromHighestDegree(
  d: HighestDegree,
  overrides?: HourlyRateOverrides,
): number | null {
  if (d === "Doctorate") return overrides?.doctorate ?? 250;
  if (d === "Master’s") return overrides?.masters ?? 225;
  if (d === "Baccalaureate") return overrides?.baccalaureate ?? 200;
  return null;
}

/**
 * Canonical hourly rate (undergraduate) derived from the faculty's highest degree — the HR Form 23B
 * educational qualification, else the legacy degree columns.
 * Stored in DB in `FacultyProfile.ratePerHour` for consistent evaluator rendering.
 *
 * If the faculty holds a designation (e.g. Campus Director, Department Chairperson) with a configured
 * `ratePerHourByDesignation` override, that takes precedence over the degree-based rate.
 */
export function computeRatePerHour(
  profile: Pick<FacultyProfile, "doctoralDegree" | "msDegree" | "bsDegree"> & {
    designation?: string | null;
    educationalQualification?: string | null;
  },
  overrides?: HourlyRateOverrides,
  ratePerHourByDesignation?: Record<string, number> | null,
): number | null {
  const designationRate = ratePerHourByDesignation?.[(profile?.designation ?? "").trim()];
  if (typeof designationRate === "number" && Number.isFinite(designationRate) && designationRate > 0) {
    return designationRate;
  }
  return ratePerHourFromHighestDegree(highestDegree(profile), overrides);
}

