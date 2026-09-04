import { FACULTY_POLICY_CONSTANTS } from "@/lib/scheduling/constants";

/** Stored in `CampusInsSettings.schedulingPolicy` (partial overrides). */
export type SchedulingPolicyConfig = {
  standardWeeklyTeachingHours?: number;
  parttimeMaxWeeklyHours?: number;
  maxWeeklyLabContactHours?: number;
  maxWeeklyLectureOverloadHours?: number;
  maxWeeklyResidentContactHours?: number;
  maxWeeklyNonResidentContactHours?: number;
  /** Soft cap for GA / suggestions (hours/week). */
  defaultMaxFacultyHoursPerWeek?: number;
  /** Merit-system hourly rates (undergraduate), editable campus-wide. */
  ratePerHourDoctorate?: number;
  ratePerHourMasters?: number;
  ratePerHourBaccalaureate?: number;
  /** Optional hourly rate overrides per designation (e.g. "Campus Director", "Department Chairperson"). */
  ratePerHourByDesignation?: Record<string, number>;
};

export type ResolvedHourlyRates = {
  DOCTORATE: number;
  MASTERS: number;
  BACCALAUREATE: number;
};

export type ResolvedFacultyPolicyConstants = {
  STANDARD_WEEKLY_TEACHING_HOURS: number;
  PARTTIME_MAX_WEEKLY_HOURS: number;
  MAX_WEEKLY_LAB_CONTACT_HOURS: number;
  MAX_WEEKLY_LECTURE_OVERLOAD_HOURS: number;
  MAX_WEEKLY_RESIDENT_CONTACT_HOURS: number;
  MAX_WEEKLY_NON_RESIDENT_CONTACT_HOURS: number;
};

export const DEFAULT_SCHEDULING_POLICY: SchedulingPolicyConfig = {
  standardWeeklyTeachingHours: FACULTY_POLICY_CONSTANTS.STANDARD_WEEKLY_TEACHING_HOURS,
  parttimeMaxWeeklyHours: FACULTY_POLICY_CONSTANTS.PARTTIME_MAX_WEEKLY_HOURS,
  maxWeeklyLabContactHours: FACULTY_POLICY_CONSTANTS.MAX_WEEKLY_LAB_CONTACT_HOURS,
  maxWeeklyLectureOverloadHours: FACULTY_POLICY_CONSTANTS.MAX_WEEKLY_LECTURE_OVERLOAD_HOURS,
  maxWeeklyResidentContactHours: FACULTY_POLICY_CONSTANTS.MAX_WEEKLY_RESIDENT_CONTACT_HOURS,
  maxWeeklyNonResidentContactHours: FACULTY_POLICY_CONSTANTS.MAX_WEEKLY_NON_RESIDENT_CONTACT_HOURS,
  defaultMaxFacultyHoursPerWeek: 24,
  ratePerHourDoctorate: 250,
  ratePerHourMasters: 225,
  ratePerHourBaccalaureate: 200,
};

function num(v: unknown, fallback: number): number {
  const n = typeof v === "number" ? v : typeof v === "string" ? parseFloat(v) : NaN;
  return Number.isFinite(n) && n > 0 ? n : fallback;
}

export function resolveFacultyPolicyConstants(
  raw: SchedulingPolicyConfig | null | undefined,
): ResolvedFacultyPolicyConstants {
  const d = DEFAULT_SCHEDULING_POLICY;
  return {
    STANDARD_WEEKLY_TEACHING_HOURS: num(raw?.standardWeeklyTeachingHours, d.standardWeeklyTeachingHours!),
    PARTTIME_MAX_WEEKLY_HOURS: num(raw?.parttimeMaxWeeklyHours, d.parttimeMaxWeeklyHours!),
    MAX_WEEKLY_LAB_CONTACT_HOURS: num(raw?.maxWeeklyLabContactHours, d.maxWeeklyLabContactHours!),
    MAX_WEEKLY_LECTURE_OVERLOAD_HOURS: num(raw?.maxWeeklyLectureOverloadHours, d.maxWeeklyLectureOverloadHours!),
    MAX_WEEKLY_RESIDENT_CONTACT_HOURS: num(raw?.maxWeeklyResidentContactHours, d.maxWeeklyResidentContactHours!),
    MAX_WEEKLY_NON_RESIDENT_CONTACT_HOURS: num(
      raw?.maxWeeklyNonResidentContactHours,
      d.maxWeeklyNonResidentContactHours!,
    ),
  };
}

export function schedulingPolicyFromResolved(c: ResolvedFacultyPolicyConstants): SchedulingPolicyConfig {
  return {
    standardWeeklyTeachingHours: c.STANDARD_WEEKLY_TEACHING_HOURS,
    parttimeMaxWeeklyHours: c.PARTTIME_MAX_WEEKLY_HOURS,
    maxWeeklyLabContactHours: c.MAX_WEEKLY_LAB_CONTACT_HOURS,
    maxWeeklyLectureOverloadHours: c.MAX_WEEKLY_LECTURE_OVERLOAD_HOURS,
    maxWeeklyResidentContactHours: c.MAX_WEEKLY_RESIDENT_CONTACT_HOURS,
    maxWeeklyNonResidentContactHours: c.MAX_WEEKLY_NON_RESIDENT_CONTACT_HOURS,
    defaultMaxFacultyHoursPerWeek: DEFAULT_SCHEDULING_POLICY.defaultMaxFacultyHoursPerWeek,
  };
}

export function resolveDefaultMaxFacultyHoursPerWeek(
  raw: SchedulingPolicyConfig | null | undefined,
): number {
  return num(raw?.defaultMaxFacultyHoursPerWeek, DEFAULT_SCHEDULING_POLICY.defaultMaxFacultyHoursPerWeek!);
}

/** Merge DB overrides with resolved teaching-load constants for the config form. */
export function resolveHourlyRates(raw: SchedulingPolicyConfig | null | undefined): ResolvedHourlyRates {
  const d = DEFAULT_SCHEDULING_POLICY;
  return {
    DOCTORATE: num(raw?.ratePerHourDoctorate, d.ratePerHourDoctorate!),
    MASTERS: num(raw?.ratePerHourMasters, d.ratePerHourMasters!),
    BACCALAUREATE: num(raw?.ratePerHourBaccalaureate, d.ratePerHourBaccalaureate!),
  };
}

/** Optional per-designation hourly rate override (e.g. Campus Director, Chairman). Falls back to null when unset. */
export function resolveRatePerHourForDesignation(
  raw: SchedulingPolicyConfig | null | undefined,
  designation: string | null | undefined,
): number | null {
  const d = (designation ?? "").trim();
  if (!d) return null;
  const map = raw?.ratePerHourByDesignation;
  const v = map?.[d];
  return typeof v === "number" && Number.isFinite(v) && v > 0 ? v : null;
}

export function mergeSchedulingPolicyDraft(
  raw: SchedulingPolicyConfig | null | undefined,
  constants: ResolvedFacultyPolicyConstants,
): SchedulingPolicyConfig {
  return {
    ...schedulingPolicyFromResolved(constants),
    ...(raw ?? {}),
    defaultMaxFacultyHoursPerWeek: resolveDefaultMaxFacultyHoursPerWeek(raw),
    ratePerHourDoctorate: resolveHourlyRates(raw).DOCTORATE,
    ratePerHourMasters: resolveHourlyRates(raw).MASTERS,
    ratePerHourBaccalaureate: resolveHourlyRates(raw).BACCALAUREATE,
    ratePerHourByDesignation: { ...(raw?.ratePerHourByDesignation ?? {}) },
  };
}
