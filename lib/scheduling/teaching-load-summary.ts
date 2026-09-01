import type { FacultyProfile, ScheduleEntry, ScheduleLoadJustification, Section, Subject, User } from "@/types/db";
import { filterByProgramMode, resolveProgramMode } from "@/lib/scheduling/program-mode";
import { slotDurationHours } from "@/lib/scheduling/facultyPolicies";

export type TeachingLoadModeSlice = {
  preps: number;
  unitsPerWeek: number;
  hoursPerWeek: number;
};

export type TeachingLoadSummaryRow = {
  instructorId: string;
  facultyName: string;
  administrativeDesignation: string | null;
  otherResponsibilities: string;
  day: TeachingLoadModeSlice;
  evening: TeachingLoadModeSlice;
  subjectsHandled: string;
  justification: string | null;
  /** Arithmetic sum of Day + Evening columns for the printed form — not a merged policy total. */
  totalPreps: number;
  totalHoursPerWeek: number;
};

const emptySlice = (): TeachingLoadModeSlice => ({ preps: 0, unitsPerWeek: 0, hoursPerWeek: 0 });

export function otherResponsibilitiesFromProfile(profile: FacultyProfile | undefined | null): string {
  const parts = [profile?.research, profile?.extension, profile?.production, profile?.specialTraining]
    .map((s) => (s ?? "").trim())
    .filter(Boolean);
  return parts.length > 0 ? parts.join("; ") : "—";
}

export function metricsForEntries(
  entries: ScheduleEntry[],
  subjectById: Map<string, Subject>,
): TeachingLoadModeSlice {
  const subjectIds = new Set<string>();
  const seenPairs = new Set<string>();
  let hours = 0;
  let units = 0;
  for (const e of entries) {
    hours += slotDurationHours(e.startTime, e.endTime);
    if (e.subjectId) subjectIds.add(e.subjectId);
    const pairKey = `${e.subjectId}:${e.sectionId}`;
    if (!seenPairs.has(pairKey)) {
      seenPairs.add(pairKey);
      const sub = subjectById.get(e.subjectId);
      if (sub) units += sub.lecUnits + sub.labUnits;
    }
  }
  return {
    preps: subjectIds.size,
    unitsPerWeek: units,
    hoursPerWeek: Math.round(hours * 100) / 100,
  };
}

export function latestJustificationText(
  justifications: ScheduleLoadJustification[],
  facultyUserId: string,
  academicPeriodId: string,
): string | null {
  const rows = justifications
    .filter((j) => j.facultyUserId === facultyUserId && j.academicPeriodId === academicPeriodId)
    .sort((a, b) => Date.parse(b.createdAt) - Date.parse(a.createdAt));
  const text = rows[0]?.justification?.trim();
  return text ? text : null;
}

function subjectCodesForEntries(entries: ScheduleEntry[], subjectById: Map<string, Subject>): string {
  const codes = new Set<string>();
  for (const e of entries) {
    const code = subjectById.get(e.subjectId)?.code?.trim();
    if (code) codes.add(code);
  }
  return [...codes].sort((a, b) => a.localeCompare(b)).join(", ") || "—";
}

/**
 * College Admin Summary of Teaching Load: instructors under departments of `collegeId`.
 * Day and Evening (`programMode: "night"`) are computed separately from live `ScheduleEntry` rows.
 */
export function buildTeachingLoadSummary(args: {
  collegeId: string;
  academicPeriodId: string;
  entries: ScheduleEntry[];
  users: User[];
  profiles: FacultyProfile[];
  programs: Array<{ id: string; collegeId: string }>;
  sections: Section[];
  subjects: Subject[];
  justifications: ScheduleLoadJustification[];
}): TeachingLoadSummaryRow[] {
  const programIds = new Set(args.programs.filter((p) => p.collegeId === args.collegeId).map((p) => p.id));
  const sectionById = new Map(args.sections.map((s) => [s.id, s]));
  const subjectById = new Map(args.subjects.map((s) => [s.id, s]));
  const profileByUserId = new Map(args.profiles.map((p) => [p.userId, p]));

  const instructorIds = new Set<string>();
  for (const u of args.users) {
    if (u.collegeId === args.collegeId && (u.role === "instructor" || u.role === "chairman_admin")) {
      instructorIds.add(u.id);
    }
  }

  const termEntries = args.entries.filter((e) => e.academicPeriodId === args.academicPeriodId);
  const collegeEntries = termEntries.filter((e) => {
    const sec = sectionById.get(e.sectionId);
    return Boolean(sec && programIds.has(sec.programId));
  });
  for (const e of collegeEntries) {
    if (e.instructorId) instructorIds.add(e.instructorId);
  }

  const userById = new Map(args.users.map((u) => [u.id, u]));
  const rows: TeachingLoadSummaryRow[] = [];

  for (const instructorId of instructorIds) {
    const mine = collegeEntries.filter((e) => e.instructorId === instructorId);
    const dayEntries = filterByProgramMode(mine, "day");
    const eveningEntries = filterByProgramMode(mine, "night");
    const day = mine.length === 0 ? emptySlice() : metricsForEntries(dayEntries, subjectById);
    const evening = mine.length === 0 ? emptySlice() : metricsForEntries(eveningEntries, subjectById);
    const profile = profileByUserId.get(instructorId);
    const user = userById.get(instructorId);
    rows.push({
      instructorId,
      facultyName: profile?.fullName?.trim() || user?.name?.trim() || instructorId,
      administrativeDesignation: profile?.designation?.trim() || null,
      otherResponsibilities: otherResponsibilitiesFromProfile(profile),
      day,
      evening,
      subjectsHandled: subjectCodesForEntries(mine, subjectById),
      justification: latestJustificationText(args.justifications, instructorId, args.academicPeriodId),
      totalPreps: day.preps + evening.preps,
      totalHoursPerWeek: Math.round((day.hoursPerWeek + evening.hoursPerWeek) * 100) / 100,
    });
  }

  rows.sort((a, b) => a.facultyName.localeCompare(b.facultyName));
  return rows;
}

/** Kept so callers can still inspect stored program mode on a row. */
export function entryProgramModeLabel(entry: ScheduleEntry): "day" | "night" {
  return resolveProgramMode(entry);
}
