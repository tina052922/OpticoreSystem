/**
 * What kind of subject a row is (`Subject.category`).
 *
 * These used to be six fixed words in this file and in a database check constraint. That could not
 * hold: a "major" is not one thing campus-wide — each program's majors are its own, with their own
 * codes — so a chairman had no way to say what kinds of subject their program actually runs.
 *
 * They are rows now (`SubjectCategory`, migration 024), owned by the program and maintained by its
 * chairman. General education, PE and NSTP are taught everywhere, so those three belong to the
 * campus and appear for every program.
 *
 * The constants below are a floor, not the list: they are what a program sees before anything has
 * been added, and what the UI falls back to when the catalog has not loaded.
 */

export type SubjectCategoryRow = {
  id: string;
  /** Null = campus-wide; every program sees it and no chairman may edit it. */
  programId: string | null;
  code: string;
  label: string;
  sortOrder: number;
};

/**
 * Taught in every program, so owned by the campus rather than by any one chairman.
 *
 * GEC and GEE are both general education and sit together; they stay separate categories because a
 * GEE is the elective half of it, and a prospectus distinguishes them.
 */
export const CAMPUS_SUBJECT_CATEGORIES: readonly SubjectCategoryRow[] = [
  { id: "subcat-campus-gec", programId: null, code: "gec", label: "GEC", sortOrder: 10 },
  { id: "subcat-campus-gee", programId: null, code: "gee", label: "GEE", sortOrder: 15 },
  { id: "subcat-campus-pe", programId: null, code: "pe", label: "PE", sortOrder: 20 },
  { id: "subcat-campus-nstp", programId: null, code: "nstp", label: "NSTP", sortOrder: 30 },
];

export const CAMPUS_SUBJECT_CATEGORY_CODES: ReadonlySet<string> = new Set(
  CAMPUS_SUBJECT_CATEGORIES.map((c) => c.code),
);

/** True for a category no chairman may rename or delete. */
export function isCampusSubjectCategory(row: Pick<SubjectCategoryRow, "programId">): boolean {
  return row.programId === null;
}

/**
 * A code as it is stored: lower case, trimmed, spaces and runs of punctuation collapsed to `-`.
 *
 * Typing "Professional Elective" and "professional-elective" must not produce two categories that
 * look the same in a dropdown and sort apart in a table.
 */
export function normalizeSubjectCategoryCode(raw: string | null | undefined): string {
  return (raw ?? "")
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

/** The categories a program may use: its own, plus the campus-wide three. */
export function subjectCategoriesForProgram(
  all: readonly SubjectCategoryRow[],
  programId: string | null | undefined,
): SubjectCategoryRow[] {
  const program = (programId ?? "").trim();
  const rows = all.filter((c) => c.programId === null || (program && c.programId === program));
  const seen = new Set<string>();
  const unique: SubjectCategoryRow[] = [];
  for (const row of rows) {
    const code = normalizeSubjectCategoryCode(row.code);
    // A program may shadow a campus code; its own wins, and the pair never both render.
    if (seen.has(code)) continue;
    seen.add(code);
    unique.push(row);
  }
  return unique.sort((a, b) => {
    if (a.sortOrder !== b.sortOrder) return a.sortOrder - b.sortOrder;
    return a.label.localeCompare(b.label);
  });
}

/**
 * `''` for a value this program does not offer, so a bad row renders blank rather than broken.
 *
 * Passing no catalog falls back to the campus-wide three, which is what a dropdown shows before the
 * categories have loaded.
 */
export function normalizeSubjectCategory(
  raw: string | null | undefined,
  available: readonly SubjectCategoryRow[] = CAMPUS_SUBJECT_CATEGORIES,
): string {
  const code = normalizeSubjectCategoryCode(raw);
  if (!code) return "";
  return available.some((c) => normalizeSubjectCategoryCode(c.code) === code) ? code : "";
}

/** "Major", "NSTP", … for display; `fallback` when the row has no category this program knows. */
export function subjectCategoryLabel(
  raw: string | null | undefined,
  available: readonly SubjectCategoryRow[] = CAMPUS_SUBJECT_CATEGORIES,
  fallback = "—",
): string {
  const code = normalizeSubjectCategoryCode(raw);
  if (!code) return fallback;
  const hit = available.find((c) => normalizeSubjectCategoryCode(c.code) === code);
  return hit?.label ?? fallback;
}

/**
 * The category a code plainly announces, for pre-filling the form as someone types.
 *
 * Only prefixes that are unambiguous campus-wide, and only when the program actually offers that
 * category — a program with no PE category should not have PATHFIT-1 fill one in. Everything else
 * returns `''`: major and minor cannot be told apart from a code, which is the whole reason the
 * category is stored rather than inferred.
 */
export function suggestSubjectCategory(
  code: string | null | undefined,
  available: readonly SubjectCategoryRow[] = CAMPUS_SUBJECT_CATEGORIES,
): string {
  const value = (code ?? "").trim().toUpperCase();
  if (!value) return "";

  const offers = (wanted: string) =>
    available.some((c) => normalizeSubjectCategoryCode(c.code) === wanted) ? wanted : "";

  // A GEE code names the elective half of general education, so it fills in GEE, not GEC.
  if (value.startsWith("GEE")) return offers("gee") || offers("gec");
  if (value.startsWith("GEC")) return offers("gec");
  if (value.startsWith("NSTP")) return offers("nstp");
  if (value.startsWith("PATHFIT") || value.startsWith("PE-")) return offers("pe");
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
