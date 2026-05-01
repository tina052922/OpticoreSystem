import type { FacultyProfile, ScheduleEntry, Subject, User } from "@/types/db";
import { FACULTY_POLICY_CONSTANTS } from "./constants";
import { designationTeachingCapHours } from "@/lib/faculty/designation-system";

function parseTimeToMinutes(t: string): number {
  const [h, m] = t.split(":").map((x) => parseInt(x, 10));
  return h * 60 + (m || 0);
}

/** Duration of one weekly meeting in hours (from timetable slot). */
export function slotDurationHours(startTime: string, endTime: string): number {
  const a = parseTimeToMinutes(startTime);
  const b = parseTimeToMinutes(endTime);
  return Math.max(0, (b - a) / 60);
}

/** Split slot hours into lecture vs lab portions using subject contact-hour mix. */
export function lectureLabSplitHours(subject: Subject | undefined, durationHours: number): { lec: number; lab: number } {
  if (!subject) return { lec: durationHours, lab: 0 };
  const lh = Math.max(0, subject.lecHours);
  const sh = Math.max(0, subject.labHours);
  const sum = lh + sh;
  if (sum <= 0) return { lec: durationHours, lab: 0 };
  const lecRatio = lh / sum;
  return {
    lec: durationHours * lecRatio,
    lab: durationHours * (1 - lecRatio),
  };
}

export type FacultyPolicyViolation = {
  code: string;
  message: string;
};

export type FacultyLoadRow = {
  instructorId: string;
  instructorName: string;
  weeklyTotalContactHours: number;
  weeklyLectureHours: number;
  weeklyLabHours: number;
  status: string | null;
  designation: string | null;
  effectiveTeachingCap: number | null;
  violations: FacultyPolicyViolation[];
};

// NOTE: `designationTeachingCapHours` now lives in `@/lib/faculty/designation-system` so UI + policy checks match.

type FacultyContext = {
  name: string;
  status: string | null;
  designation: string | null;
};

function buildFacultyContext(
  instructorId: string,
  userById: Map<string, User>,
  profileByUserId: Map<string, FacultyProfile>,
): FacultyContext {
  const u = userById.get(instructorId);
  const p = profileByUserId.get(instructorId);
  return {
    name: p?.fullName ?? u?.name ?? instructorId,
    status: p?.status ?? null,
    designation: p?.designation ?? null,
  };
}

function collectViolations(
  ctx: FacultyContext,
  weeklyTotal: number,
  weeklyLec: number,
  weeklyLab: number,
): FacultyPolicyViolation[] {
  const v: FacultyPolicyViolation[] = [];
  const C = FACULTY_POLICY_CONSTANTS;

  const desCap = designationTeachingCapHours(ctx.designation);
  /** Aligns with `FacultyProfile.status`: canonical `Part-time` or any legacy string containing "part". */
  const partTime = (ctx.status ?? "").toLowerCase().includes("part");

  if (partTime && weeklyTotal > C.PARTTIME_MAX_WEEKLY_HOURS + 1e-6) {
    v.push({
      code: "PARTTIME_WEEKLY_OVER_CAP",
      message: `Part-time teaching exceeds ${C.PARTTIME_MAX_WEEKLY_HOURS} hrs/week (Faculty Manual).`,
    });
  }

  if (desCap != null && weeklyTotal > desCap + 1e-6) {
    v.push({
      code: "OVER_DESIGNATION_TEACHING_CAP",
      message: `Teaching contact (${weeklyTotal.toFixed(1)} hrs/wk) exceeds designation cap (${desCap} hrs/wk).`,
    });
  } else if (!partTime && desCap == null && weeklyTotal > C.STANDARD_WEEKLY_TEACHING_HOURS + 1e-6) {
    v.push({
      code: "OVER_STANDARD_TEACHING_LOAD",
      message: `Teaching contact (${weeklyTotal.toFixed(1)} hrs/wk) exceeds standard ${C.STANDARD_WEEKLY_TEACHING_HOURS} hrs/week (undergraduate norm).`,
    });
  }

  if (weeklyLab > C.MAX_WEEKLY_LAB_CONTACT_HOURS + 1e-6) {
    v.push({
      code: "LAB_WEEKLY_OVER_CAP",
      message: `Laboratory/shop contact exceeds ${C.MAX_WEEKLY_LAB_CONTACT_HOURS} hrs/week.`,
    });
  }

  if (weeklyLec > C.MAX_WEEKLY_LECTURE_OVERLOAD_HOURS + 1e-6) {
    v.push({
      code: "LECTURE_WEEKLY_OVER_CAP",
      message: `Lecture-equivalent contact exceeds ${C.MAX_WEEKLY_LECTURE_OVERLOAD_HOURS} hrs/week (overload policy).`,
    });
  }

  if (weeklyTotal > C.MAX_WEEKLY_RESIDENT_CONTACT_HOURS + 1e-6) {
    v.push({
      code: "WEEKLY_CONTACT_OVER_RESIDENT_MAX",
      message: `Scheduled teaching contact (${weeklyTotal.toFixed(1)} hrs/wk) exceeds ${C.MAX_WEEKLY_RESIDENT_CONTACT_HOURS} hrs/week (resident faculty workload reference).`,
    });
  }

  return v;
}

/**
 * Aggregates weekly teaching contact from timetable rows and tests CTU Faculty Manual–aligned rules.
 *
 * **Campus-wide totals:** every row in `entries` counts toward its instructor’s weekly contact — including
 * assignments in other colleges (e.g. COTE faculty teaching a CAS section). Same universe as
 * `getInstructorScheduleRows`, INS Form 5A, and faculty My Schedule. `collegeId` and `sectionToCollegeId` are legacy
 * parameters; overload policy uses the instructor’s **full** term load, not a single-college slice.
 */
export function evaluateFacultyLoadsForCollege(
  entries: ScheduleEntry[],
  subjectsById: Map<string, Subject>,
  userById: Map<string, User>,
  profileByUserId: Map<string, FacultyProfile>,
  _collegeId: string,
  _sectionToCollegeId: (sectionId: string) => string | null,
): { rows: FacultyLoadRow[]; hasAnyViolation: boolean } {
  const byInstructor = new Map<
    string,
    { total: number; lec: number; lab: number }
  >();

  for (const e of entries) {
    const sub = subjectsById.get(e.subjectId);
    const dur = slotDurationHours(e.startTime, e.endTime);
    const { lec, lab } = lectureLabSplitHours(sub, dur);
    const cur = byInstructor.get(e.instructorId) ?? { total: 0, lec: 0, lab: 0 };
    cur.total += dur;
    cur.lec += lec;
    cur.lab += lab;
    byInstructor.set(e.instructorId, cur);
  }

  const rows: FacultyLoadRow[] = [];
  let hasAnyViolation = false;

  for (const [instructorId, hrs] of byInstructor) {
    const ctx = buildFacultyContext(instructorId, userById, profileByUserId);
    const desCap = designationTeachingCapHours(ctx.designation);
    const effectiveTeachingCap = desCap ?? FACULTY_POLICY_CONSTANTS.STANDARD_WEEKLY_TEACHING_HOURS;
    const violations = collectViolations(ctx, hrs.total, hrs.lec, hrs.lab);
    if (violations.length > 0) hasAnyViolation = true;
    rows.push({
      instructorId,
      instructorName: ctx.name,
      weeklyTotalContactHours: hrs.total,
      weeklyLectureHours: hrs.lec,
      weeklyLabHours: hrs.lab,
      status: ctx.status,
      designation: ctx.designation,
      effectiveTeachingCap,
      violations,
    });
  }

  rows.sort((a, b) => a.instructorName.localeCompare(b.instructorName));
  return { rows, hasAnyViolation };
}
