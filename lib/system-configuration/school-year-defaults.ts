/**
 * Defaults for "Add school year" in System Configuration, read from the computer's date.
 *
 * CTU calendar: 1st Semester August–December, 2nd Semester January–June. Every value here is only
 * a starting point — the admin can change all of it before saving.
 */

export type SemesterSpanDraft = { startDate: string; endDate: string };

export type SchoolYearDraft = {
  academicYear: string;
  firstSemester: SemesterSpanDraft;
  secondSemester: SemesterSpanDraft;
};

const pad = (n: number) => String(n).padStart(2, "0");

/** Local `YYYY-MM-DD` for a Date (the computer's own calendar day, not UTC). */
export function todayYmd(now: Date = new Date()): string {
  return `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`;
}

/**
 * The school year a date belongs to: August onwards starts a new one, January–July belongs to the
 * one that started the August before. 10 Nov 2026 → 2026; 14 Feb 2027 → 2026.
 */
export function schoolYearStartFor(now: Date = new Date()): number {
  return now.getMonth() >= 7 ? now.getFullYear() : now.getFullYear() - 1;
}

/** Default spans for the school year starting in `startYear`. */
export function defaultSchoolYearDraft(startYear: number): SchoolYearDraft {
  return {
    academicYear: `${startYear}-${startYear + 1}`,
    firstSemester: { startDate: `${startYear}-08-01`, endDate: `${startYear}-12-31` },
    secondSemester: { startDate: `${startYear + 1}-01-01`, endDate: `${startYear + 1}-06-30` },
  };
}

/**
 * The first school year from today's that is not complete yet — missing its 1st or 2nd Semester.
 * Pass every existing period's `academicYear` (a complete year appears twice).
 */
export function suggestedSchoolYearDraft(
  existingAcademicYears: Iterable<string>,
  now: Date = new Date(),
): SchoolYearDraft {
  const counts = new Map<string, number>();
  for (const y of existingAcademicYears) counts.set(y.trim(), (counts.get(y.trim()) ?? 0) + 1);
  const taken = new Set([...counts].filter(([, n]) => n >= 2).map(([y]) => y));
  let start = schoolYearStartFor(now);
  for (let i = 0; i < 20 && taken.has(`${start}-${start + 1}`); i++) start++;
  return defaultSchoolYearDraft(start);
}

/** "2026-2027" → 2026, or null when it is not two consecutive years. */
export function parseSchoolYearStart(raw: string): number | null {
  const m = /^(\d{4})\s*[-–]\s*(\d{4})$/.exec(raw.trim());
  if (!m) return null;
  const a = Number(m[1]);
  return Number(m[2]) === a + 1 ? a : null;
}

/** The period whose span contains `today`, if any. */
export function periodContainingDate<T extends { startDate: string | null; endDate: string | null }>(
  periods: readonly T[],
  today: string,
): T | null {
  for (const p of periods) {
    const s = (p.startDate ?? "").slice(0, 10);
    const e = (p.endDate ?? "").slice(0, 10);
    if (s && e && s <= today && today <= e) return p;
  }
  return null;
}

/** "Aug 1, 2026 – Dec 31, 2026"; blank when a date is missing. */
export function formatSpan(startDate: string | null | undefined, endDate: string | null | undefined): string {
  const fmt = (v: string | null | undefined) => {
    const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(v ?? "");
    if (!m) return "";
    return new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3])).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  };
  const a = fmt(startDate);
  const b = fmt(endDate);
  return a && b ? `${a} – ${b}` : a || b;
}
