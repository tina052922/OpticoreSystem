/**
 * A subject's area (Subject Codes → Subject area), separate from its curriculum category.
 *
 * Since migration 035 the values are the service areas DOI / College Admin keep (ServiceArea.code:
 * gec, hss, nsm, pe, …); tagging a subject with an area puts it in that Service Chair's scope.
 * The three original options stay as the fallback before areas exist.
 * Mirrors `opticore-backend/src/lib/subject-area.ts`.
 */
export const SUBJECT_AREA_OPTIONS = [
  { code: "pe", label: "Physical Education (PE)" },
  { code: "psychology", label: "Psychology" },
  { code: "nsm", label: "Natural Science and Mathematics" },
] as const;

export type SubjectArea = string;

export type SubjectAreaChoice = { code: string; label: string };

/** Service areas as choices, else the original three. */
export function subjectAreaChoices(areas?: readonly { code: string; name: string }[] | null): SubjectAreaChoice[] {
  if (areas && areas.length > 0) return areas.map((a) => ({ code: a.code.toLowerCase(), label: a.name }));
  return SUBJECT_AREA_OPTIONS.map((o) => ({ code: o.code, label: o.label }));
}

export function normalizeSubjectArea(raw: unknown): SubjectArea | "" {
  const s = String(raw ?? "").trim().toLowerCase();
  return /^[a-z0-9-]{1,24}$/.test(s) ? s : "";
}

export function subjectAreaLabel(
  raw: unknown,
  empty = "—",
  areas?: readonly { code: string; name: string }[] | null,
): string {
  const code = normalizeSubjectArea(raw);
  if (!code) return empty;
  return subjectAreaChoices(areas).find((o) => o.code === code)?.label ?? code.toUpperCase();
}

/** Short form for the table column. */
export function subjectAreaShortLabel(
  raw: unknown,
  empty = "—",
  areas?: readonly { code: string; name: string }[] | null,
): string {
  const code = normalizeSubjectArea(raw);
  if (!code) return empty;
  if (code === "pe") return "PE";
  if (code === "nsm") return "Nat. Sci. & Math";
  if (code === "psychology") return "Psychology";
  return subjectAreaLabel(code, empty, areas);
}
