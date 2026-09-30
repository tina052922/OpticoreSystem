/**
 * What kind of subject a row is (`Subject.category`, migration 016).
 *
 * The code prefix hints at some of these — GEC-, GEE-, NSTP-, PATHFIT- — but says nothing about
 * major vs minor, so the category is stored rather than inferred at read time. `suggestSubjectCategory`
 * exists only to pre-fill the form from a code the user is typing; it never overwrites a stored value.
 */

export const SUBJECT_CATEGORIES = [
  { value: "major", label: "Major" },
  { value: "gec", label: "GEC" },
  { value: "nstp", label: "NSTP" },
] as const;

export type SubjectCategory = (typeof SUBJECT_CATEGORIES)[number]["value"];

const VALUES = new Set<string>(SUBJECT_CATEGORIES.map((c) => c.value));

/** `''` for anything that is not one of the stored values, so a bad row renders blank, not broken. */
export function normalizeSubjectCategory(raw: string | null | undefined): SubjectCategory | "" {
  const value = (raw ?? "").trim().toLowerCase();
  return VALUES.has(value) ? (value as SubjectCategory) : "";
}

/** "Major", "NSTP", … for display; `fallback` when the row has no category yet. */
export function subjectCategoryLabel(
  raw: string | null | undefined,
  fallback = "—",
): string {
  const value = normalizeSubjectCategory(raw);
  if (!value) return fallback;
  return SUBJECT_CATEGORIES.find((c) => c.value === value)?.label ?? fallback;
}

/**
 * Category a code plainly announces, for pre-filling the form as someone types.
 * Returns `''` when the code says nothing — major and minor are indistinguishable from a code.
 */
export function suggestSubjectCategory(code: string | null | undefined): SubjectCategory | "" {
  const value = (code ?? "").trim().toUpperCase();
  if (!value) return "";
  if (value.startsWith("GEC")) return "gec";
  if (value.startsWith("NSTP")) return "nstp";
  return "";
}

export const SUBJECT_SEMESTERS = [
  { value: 1, label: "1st Semester" },
  { value: 2, label: "2nd Semester" },
] as const;

/** `null` when unset — the column is nullable and many rows predate it. */
export function normalizeSubjectSemester(raw: unknown): 1 | 2 | null {
  const n = typeof raw === "number" ? raw : parseInt(String(raw ?? ""), 10);
  return n === 1 || n === 2 ? n : null;
}

/** "1st" / "2nd" for a table cell; `fallback` when the row has no semester. */
export function subjectSemesterLabel(raw: unknown, fallback = "—"): string {
  const sem = normalizeSubjectSemester(raw);
  if (!sem) return fallback;
  return sem === 1 ? "1st" : "2nd";
}
