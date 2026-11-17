/**
 * A subject's discipline area (migration 032), separate from its curriculum category.
 * Mirrors `opticore-backend/src/lib/subject-area.ts`.
 */
export const SUBJECT_AREA_OPTIONS = [
  { code: "pe", label: "Physical Education (PE)" },
  { code: "psychology", label: "Psychology" },
  { code: "nsm", label: "Natural Science and Mathematics" },
] as const;

export type SubjectArea = (typeof SUBJECT_AREA_OPTIONS)[number]["code"];

export function normalizeSubjectArea(raw: unknown): SubjectArea | "" {
  const s = String(raw ?? "").trim().toLowerCase();
  return (SUBJECT_AREA_OPTIONS.find((o) => o.code === s)?.code ?? "") as SubjectArea | "";
}

export function subjectAreaLabel(raw: unknown, empty = "—"): string {
  const code = normalizeSubjectArea(raw);
  return SUBJECT_AREA_OPTIONS.find((o) => o.code === code)?.label ?? empty;
}

/** Short form for the table column. */
export function subjectAreaShortLabel(raw: unknown, empty = "—"): string {
  const code = normalizeSubjectArea(raw);
  if (code === "pe") return "PE";
  if (code === "psychology") return "Psychology";
  if (code === "nsm") return "Nat. Sci. & Math";
  return empty;
}
