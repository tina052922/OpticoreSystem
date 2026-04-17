import type { FacultyProfile, User } from "@/types/db";

/**
 * Evaluator instructor pickers: each `<option value>` is `public.User.id` (FK on `ScheduleEntry.instructorId`).
 * **Display** uses Faculty Profile full name when present, else `User.name`. `User.employeeId` stays on the row for
 * self-registration / placeholder migration — it is not shown in Evaluator labels.
 */

export type InstructorPlotOption = {
  id: string;
  /** Present on `User` for registration linking — not shown in Evaluator UI. */
  employeeId: string;
  /** Faculty Profile `fullName` when set, else `User.name` — shown in dropdowns and read-only cells. */
  fullName: string;
  sortKey: string;
};

function evaluatorInstructorFullName(
  u: User,
  profile: Pick<FacultyProfile, "fullName"> | null | undefined,
): string {
  const fromProfile = profile?.fullName?.trim();
  if (fromProfile) return fromProfile;
  return (u.name ?? "").trim() || "—";
}

/** Prefer instructors with a non-empty Employee ID — chairs set IDs in Faculty Profile before plotting. */
export function usersToInstructorPlotOptions(
  users: User[],
  profileByUserId?: Map<string, Pick<FacultyProfile, "fullName">>,
): InstructorPlotOption[] {
  const out: InstructorPlotOption[] = [];
  for (const u of users) {
    const eid = (u.employeeId ?? "").trim();
    if (!eid) continue;
    const fp = profileByUserId?.get(u.id);
    const fullName = evaluatorInstructorFullName(u, fp ?? null);
    out.push({
      id: u.id,
      employeeId: eid,
      fullName,
      sortKey: fullName.toLowerCase(),
    });
  }
  out.sort((a, b) => a.sortKey.localeCompare(b.sortKey));
  return out;
}

/**
 * Include users who already appear on plotted rows but lack an Employee ID (legacy data) so the `<select>` value
 * still resolves; chairs should set Employee ID in Faculty Profile and re-save.
 */
export function mergeLegacyRowInstructorsIntoPlotOptions(
  base: InstructorPlotOption[],
  allCollegeInstructors: User[],
  rowInstructorIds: Iterable<string>,
  profileByUserId?: Map<string, Pick<FacultyProfile, "fullName">>,
): InstructorPlotOption[] {
  const byId = new Map(base.map((o) => [o.id, o]));
  const needed = new Set<string>();
  for (const id of rowInstructorIds) {
    if (id && !byId.has(id)) needed.add(id);
  }
  if (needed.size === 0) return base;
  const extra: InstructorPlotOption[] = [];
  for (const u of allCollegeInstructors) {
    if (!needed.has(u.id)) continue;
    const eid = (u.employeeId ?? "").trim();
    const fullName = evaluatorInstructorFullName(u, profileByUserId?.get(u.id) ?? null);
    extra.push({
      id: u.id,
      employeeId: eid || "(missing)",
      fullName,
      sortKey: fullName.toLowerCase(),
    });
    byId.set(u.id, extra[extra.length - 1]!);
  }
  return [...base, ...extra].sort((a, b) => a.sortKey.localeCompare(b.sortKey));
}

export function formatInstructorPlotOptionLabel(opt: InstructorPlotOption): string {
  return opt.fullName;
}

export function filterInstructorPlotOptions(
  options: InstructorPlotOption[],
  query: string,
): InstructorPlotOption[] {
  const q = query.trim().toLowerCase();
  if (!q) return options;
  return options.filter(
    (o) =>
      o.sortKey.includes(q) ||
      o.employeeId.toLowerCase().includes(q) ||
      o.fullName.toLowerCase().includes(q),
  );
}

/**
 * Evaluator tables / previews / DOI hints: full name only (no Employee ID). `User.id` remains the stored FK.
 */
export function formatUserInstructorLabel(
  u: User | undefined,
  profile?: Pick<FacultyProfile, "fullName"> | null,
): string {
  if (!u) return "—";
  return evaluatorInstructorFullName(u, profile ?? null);
}
