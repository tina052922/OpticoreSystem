/**
 * Search over colleges and departments for the scope picker.
 *
 * Buildings & Rooms used two dependent dropdowns (College, then Program). With a dozen departments
 * that is two clicks and a scroll to reach one you already know the code of — so the page now takes
 * a single query and matches either kind of scope.
 */

export type ScopeCollege = { id: string; code: string; name: string };
export type ScopeProgram = { id: string; code: string; name: string; collegeId: string | null };

export type ScopeOption = {
  /** `college:<id>` or `program:<id>` — stable key for lists and selection. */
  key: string;
  kind: "college" | "program";
  collegeId: string | null;
  /** Null for a college-wide scope. */
  programId: string | null;
  /** Short label: the code ("COTE", "BSIT"). */
  code: string;
  /** Full name, shown under the code. */
  name: string;
  /** For a department, the college it sits in; blank for a college. */
  parentLabel: string;
};

function norm(v: string | null | undefined): string {
  return (v ?? "").replace(/\s+/g, " ").trim().toLowerCase();
}

/** Every scope a person may pick: each college, then its departments. */
export function buildScopeOptions(
  colleges: readonly ScopeCollege[],
  programs: readonly ScopeProgram[],
): ScopeOption[] {
  const collegeById = new Map(colleges.map((c) => [c.id, c]));
  const out: ScopeOption[] = [];

  for (const c of [...colleges].sort((a, b) => a.code.localeCompare(b.code))) {
    out.push({
      key: `college:${c.id}`,
      kind: "college",
      collegeId: c.id,
      programId: null,
      code: c.code,
      name: c.name,
      parentLabel: "",
    });
  }

  for (const p of [...programs].sort((a, b) => a.code.localeCompare(b.code))) {
    const parent = p.collegeId ? collegeById.get(p.collegeId) : undefined;
    out.push({
      key: `program:${p.id}`,
      kind: "program",
      collegeId: p.collegeId ?? null,
      programId: p.id,
      code: p.code,
      name: p.name,
      parentLabel: parent?.code ?? "",
    });
  }

  return out;
}

/**
 * Options matching a query, best first.
 *
 * Matches the code, the name and the parent college, so "cote", "technology" and "BSIT" all land.
 * An exact code match sorts first, then a code that starts with the query, then everything else —
 * typing "BSIT" should not bury BSIT under "BSIT-related" names.
 */
export function searchScopeOptions(
  options: readonly ScopeOption[],
  query: string,
  limit = 12,
): ScopeOption[] {
  const q = norm(query);
  if (!q) return options.slice(0, limit);

  const scored: { option: ScopeOption; score: number }[] = [];
  for (const option of options) {
    const code = norm(option.code);
    const name = norm(option.name);
    const parent = norm(option.parentLabel);

    let score = -1;
    if (code === q) score = 0;
    else if (code.startsWith(q)) score = 1;
    else if (name.startsWith(q)) score = 2;
    else if (code.includes(q)) score = 3;
    else if (name.includes(q)) score = 4;
    else if (parent.includes(q)) score = 5;

    if (score >= 0) scored.push({ option, score });
  }

  return scored
    .sort((a, b) => {
      if (a.score !== b.score) return a.score - b.score;
      // Colleges before their departments at equal relevance.
      if (a.option.kind !== b.option.kind) return a.option.kind === "college" ? -1 : 1;
      return a.option.code.localeCompare(b.option.code);
    })
    .slice(0, limit)
    .map((s) => s.option);
}

/** The option currently in scope, or null for campus-wide. */
export function findScopeOption(
  options: readonly ScopeOption[],
  scope: { collegeId: string | null; programId: string | null },
): ScopeOption | null {
  if (scope.programId) {
    return options.find((o) => o.programId === scope.programId) ?? null;
  }
  if (scope.collegeId) {
    return options.find((o) => o.kind === "college" && o.collegeId === scope.collegeId) ?? null;
  }
  return null;
}

/** "BSIT — Bachelor of Science in Information Technology (COTE)" for the closed input. */
export function scopeOptionLabel(option: ScopeOption | null | undefined): string {
  if (!option) return "";
  const base = `${option.code} — ${option.name}`;
  return option.parentLabel ? `${base} (${option.parentLabel})` : base;
}
