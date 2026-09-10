import type { FacultyProfile, ScheduleEntry, ScheduleLoadJustification, Section, Subject, User } from "@/types/db";
import { filterByProgramMode, hydrateScheduleEntries, resolveProgramMode } from "@/lib/scheduling/program-mode";
import { slotDurationHours } from "@/lib/scheduling/time";
import { isPlottableFacultyUser } from "@/lib/auth/instructor-validation";
import { subjectPrepKey } from "@/lib/scheduling/prep-key";

export type TeachingLoadModeSlice = {
  preps: number;
  unitsPerWeek: number;
  /** Sum of plotted slot durations (`endTime - startTime`) for this mode only. */
  hoursPerWeek: number;
  /** Distinct subject labels for this mode only (lec+lab collapsed). */
  subjectsHandled: string;
};

export type TeachingLoadSummaryRow = {
  instructorId: string;
  facultyName: string;
  administrativeDesignation: string | null;
  otherResponsibilities: string;
  day: TeachingLoadModeSlice;
  evening: TeachingLoadModeSlice;
  /**
   * Display helper for the single Subjects Handled column.
   * Day and Evening lists stay separate (`Day: …` / `Eve: …`) — never a merged prep count.
   */
  subjectsHandled: string;
  justification: string | null;
  /** Arithmetic sum of Day + Evening columns for the printed form — not a merged policy total. */
  totalPreps: number;
  totalHoursPerWeek: number;
  /** Home program (`User.chairmanProgramId`) when it belongs to this college. */
  homeProgramId: string | null;
};

export type TeachingLoadProgramRef = {
  id: string;
  collegeId: string;
  code?: string | null;
  name?: string | null;
};

export type TeachingLoadCategoryGroup = {
  programId: string;
  categoryLabel: string;
  rows: TeachingLoadSummaryRow[];
};

/** Institutional department order for College of Technology / Engineering summaries. */
export const TEACHING_LOAD_CATEGORY_ORDER: { programId: string; label: string }[] = [
  { programId: "prog-bsit", label: "BSIT" },
  { programId: "prog-bsie", label: "BSIE" },
  { programId: "prog-bit-dt", label: "BIT – Drafting" },
  { programId: "prog-bit-gar", label: "BIT – Garments" },
  { programId: "prog-bit-elx", label: "BIT – Electronics" },
  { programId: "prog-bit-auto", label: "BIT – Automotive" },
];

export function categoryLabelForProgram(program: TeachingLoadProgramRef): string {
  const known = TEACHING_LOAD_CATEGORY_ORDER.find((x) => x.programId === program.id);
  if (known) return known.label;
  const code = (program.code ?? "").trim();
  const name = (program.name ?? "").trim();
  if (code && name && !name.toUpperCase().includes(code.toUpperCase())) return `${code} — ${name}`;
  return code || name || program.id;
}

export function sortProgramsForTeachingLoad<T extends TeachingLoadProgramRef>(programs: T[]): T[] {
  const order = TEACHING_LOAD_CATEGORY_ORDER.map((x) => x.programId);
  return [...programs].sort((a, b) => {
    const ia = order.indexOf(a.id);
    const ib = order.indexOf(b.id);
    if (ia >= 0 && ib >= 0) return ia - ib;
    if (ia >= 0) return -1;
    if (ib >= 0) return 1;
    return categoryLabelForProgram(a).localeCompare(categoryLabelForProgram(b));
  });
}

export function otherResponsibilitiesFromProfile(profile: FacultyProfile | undefined | null): string {
  const parts = [profile?.research, profile?.extension, profile?.production, profile?.specialTraining]
    .map((s) => (s ?? "").trim())
    .filter(Boolean);
  return parts.length > 0 ? parts.join("; ") : "—";
}

export function subjectCodesForEntries(entries: ScheduleEntry[], subjectById: Map<string, Subject>): string {
  /** One display label per preparation; prefer lecture-style codes over lab suffixes. */
  const byPrep = new Map<string, string>();
  for (const e of entries) {
    const raw = subjectById.get(e.subjectId)?.code?.trim();
    if (!raw) continue;
    const prep = subjectPrepKey(raw) || raw;
    const prev = byPrep.get(prep);
    if (!prev) {
      byPrep.set(prep, raw);
      continue;
    }
    const prevIsLab = /L$/i.test(prev.replace(/[\s\-_.]/g, "")) || /\bLAB\b/i.test(prev);
    const rawIsLab = /L$/i.test(raw.replace(/[\s\-_.]/g, "")) || /\bLAB\b/i.test(raw);
    if (prevIsLab && !rawIsLab) byPrep.set(prep, raw);
  }
  return [...byPrep.values()].sort((a, b) => a.localeCompare(b)).join(", ") || "—";
}

/** Label Day / Eve lists without merging prep counts across modes. */
export function formatModeSeparatedSubjects(daySubjects: string, eveningSubjects: string): string {
  const day = daySubjects.trim() && daySubjects !== "—" ? daySubjects.trim() : "";
  const eve = eveningSubjects.trim() && eveningSubjects !== "—" ? eveningSubjects.trim() : "";
  if (day && eve) return `Day: ${day}\nEve: ${eve}`;
  if (day) return `Day: ${day}`;
  if (eve) return `Eve: ${eve}`;
  return "—";
}

export function metricsForEntries(
  entries: ScheduleEntry[],
  subjectById: Map<string, Subject>,
): TeachingLoadModeSlice {
  const subjectIds = new Set<string>();
  const prepKeys = new Set<string>();
  const seenPairs = new Set<string>();
  let hours = 0;
  let units = 0;
  for (const e of entries) {
    // Always use plotted wall-clock duration — never subject catalog lec/lab hours.
    hours += slotDurationHours(e.startTime, e.endTime);
    if (e.subjectId) subjectIds.add(e.subjectId);
    const prep = subjectPrepKey(subjectById.get(e.subjectId)?.code) || e.subjectId;
    if (prep) prepKeys.add(prep);
    const pairKey = `${e.subjectId}:${e.sectionId}`;
    if (!seenPairs.has(pairKey)) {
      seenPairs.add(pairKey);
      const sub = subjectById.get(e.subjectId);
      if (sub) units += sub.lecUnits + sub.labUnits;
    }
  }
  return {
    preps: prepKeys.size || subjectIds.size,
    unitsPerWeek: units,
    hoursPerWeek: Math.round(hours * 100) / 100,
    subjectsHandled: subjectCodesForEntries(entries, subjectById),
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
  programs: TeachingLoadProgramRef[];
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
    if (u.collegeId === args.collegeId && isPlottableFacultyUser(u)) {
      instructorIds.add(u.id);
    }
  }

  // Resolve Night:: / missing programMode before splitting — prevents Day/Eve mix on legacy rows.
  const termEntries = hydrateScheduleEntries(
    args.entries.filter((e) => e.academicPeriodId === args.academicPeriodId),
  );
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
    const day = metricsForEntries(dayEntries, subjectById);
    const evening = metricsForEntries(eveningEntries, subjectById);
    const profile = profileByUserId.get(instructorId);
    const user = userById.get(instructorId);
    const homeProgramId =
      user?.chairmanProgramId && programIds.has(user.chairmanProgramId) ? user.chairmanProgramId : null;
    rows.push({
      instructorId,
      facultyName: profile?.fullName?.trim() || user?.name?.trim() || instructorId,
      administrativeDesignation: profile?.designation?.trim() || null,
      otherResponsibilities: otherResponsibilitiesFromProfile(profile),
      day,
      evening,
      subjectsHandled: formatModeSeparatedSubjects(day.subjectsHandled, evening.subjectsHandled),
      justification: latestJustificationText(args.justifications, instructorId, args.academicPeriodId),
      totalPreps: day.preps + evening.preps,
      totalHoursPerWeek: Math.round((day.hoursPerWeek + evening.hoursPerWeek) * 100) / 100,
      homeProgramId,
    });
  }

  rows.sort((a, b) => a.facultyName.localeCompare(b.facultyName));
  return rows;
}

function rowHasLoad(row: TeachingLoadSummaryRow): boolean {
  return row.totalPreps > 0 || row.totalHoursPerWeek > 0;
}

/**
 * One table per department/program under the college (BSIT, BSIE, BIT tracks, then any other programs).
 * Metrics in each group use only that program's plotted `ScheduleEntry` rows. Day and Evening stay separate.
 */
export function buildTeachingLoadSummaryByCategory(
  args: Parameters<typeof buildTeachingLoadSummary>[0],
): TeachingLoadCategoryGroup[] {
  const collegePrograms = sortProgramsForTeachingLoad(
    args.programs.filter((p) => p.collegeId === args.collegeId),
  );
  return collegePrograms.map((program) => {
    const rows = buildTeachingLoadSummary({ ...args, programs: [program] }).filter(
      (r) => rowHasLoad(r) || r.homeProgramId === program.id,
    );
    return {
      programId: program.id,
      categoryLabel: categoryLabelForProgram(program),
      rows,
    };
  });
}

/** Kept so callers can still inspect stored program mode on a row. */
export function entryProgramModeLabel(entry: ScheduleEntry): "day" | "night" {
  return resolveProgramMode(entry);
}
