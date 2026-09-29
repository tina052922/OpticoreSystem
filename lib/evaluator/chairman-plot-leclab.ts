import { normalizeProspectusCode, type BsitSemester, type ProspectusSubjectRow } from "@/lib/chairman/bsit-prospectus";
import {
  getProspectusSubjectsForProgram,
  prospectusRowForProgram,
  prospectusSubjectsForProgramYearAndSemester,
  prospectusSubjectsForProgramYearLevel,
} from "@/lib/chairman/prospectus-registry";

export type PlotLecLabMode = "lec" | "lab";

/**
 * The program's rows from Subject Codes — what the chairman actually maintains.
 *
 * These lookups used to read the static prospectus alone, which broke two ways. A subject that
 * exists only in Subject Codes resolved to nothing, and — worse — a subject the chairman EDITED in
 * Subject Codes was overruled by the hardcoded row. AP-6 ships in the BSIT prospectus as
 * `labUnits: 0`, so adding 3 lab units to it in Subject Codes changed nothing: the evaluator kept
 * reading the static row and offered lecture only.
 */
export type ExtraSubjectRows = readonly ProspectusSubjectRow[] | undefined;

/**
 * Subject Codes wins over the prospectus wherever both carry a code.
 *
 * The prospectus is a seed for programs whose catalog is not filled in yet; the catalog is live data
 * the chairman edits, so it is the one that decides units and hours.
 */
function allRowsFor(programCode: string, extraRows: ExtraSubjectRows): ProspectusSubjectRow[] {
  const base = getProspectusSubjectsForProgram(programCode);
  if (!extraRows || extraRows.length === 0) return base;
  const byCode = new Map(base.map((r) => [normalizeProspectusCode(r.code), r]));
  for (const r of extraRows) byCode.set(normalizeProspectusCode(r.code), r);
  return [...byCode.values()];
}

/** One subject row: Subject Codes first, the prospectus only as a fallback. */
export function subjectRowFor(
  programCode: string,
  subjectCode: string,
  extraRows: ExtraSubjectRows,
): ProspectusSubjectRow | undefined {
  const norm = normalizeProspectusCode(subjectCode);
  const fromCatalog = extraRows?.find((r) => normalizeProspectusCode(r.code) === norm);
  if (fromCatalog) return fromCatalog;
  return prospectusRowForProgram(programCode, subjectCode);
}

function stripLecLabTitleSuffix(title: string): string {
  return title.replace(/\s*\((?:Lec|Lab|Lecture|Laboratory)\)\s*/gi, "").trim();
}

function isLabProspectusRow(row: ProspectusSubjectRow): boolean {
  if (/\(\s*Lab(?:oratory)?\s*\)/i.test(row.title)) return true;
  if (row.labUnits > 0 && row.lecUnits === 0) return true;
  // Some curricula store lab contact in labHours only (labUnits left at 0).
  if ((row.labHours ?? 0) > 0 && (row.lecHours ?? 0) === 0 && row.labUnits === 0) return true;
  return false;
}

export function inferLecLabMode(
  programCode: string,
  subjectCode: string,
  extraRows?: ExtraSubjectRows,
): PlotLecLabMode {
  if (!subjectCode) return "lec";
  const p = subjectRowFor(programCode, subjectCode, extraRows);
  const all = allRowsFor(programCode, extraRows);
  const norm = normalizeProspectusCode(subjectCode);

  // Explicit lab twin of another prospectus code (…L), even when units are mis-keyed.
  const hasLecTwin = all.some((s) => normalizeProspectusCode(s.code) + "L" === norm);
  if (hasLecTwin) return "lab";

  if (p && isLabProspectusRow(p)) return "lab";
  return "lec";
}

/** Resolve paired Lec/Lab prospectus codes (e.g. CC-112 ↔ CC-112L). */
export function getLecLabPair(
  programCode: string,
  subjectCode: string,
  extraRows?: ExtraSubjectRows,
): { lecCode: string | null; labCode: string | null; mode: PlotLecLabMode } {
  const row = subjectCode ? subjectRowFor(programCode, subjectCode, extraRows) : undefined;
  if (!row || !subjectCode) {
    return { lecCode: null, labCode: null, mode: "lec" };
  }
  const all = allRowsFor(programCode, extraRows);
  const norm = normalizeProspectusCode(subjectCode);
  const mode = inferLecLabMode(programCode, subjectCode, extraRows);
  const baseTitle = stripLecLabTitleSuffix(row.title);

  if (mode === "lab") {
    const lecRow =
      all.find((s) => normalizeProspectusCode(s.code) + "L" === norm) ??
      all.find(
        (s) =>
          !isLabProspectusRow(s) &&
          stripLecLabTitleSuffix(s.title) === baseTitle &&
          (s.lecUnits > 0 || (s.lecHours ?? 0) > 0),
      );
    return { lecCode: lecRow?.code ?? null, labCode: subjectCode, mode: "lab" };
  }

  const labRow =
    all.find((s) => normalizeProspectusCode(s.code) === norm + "L") ??
    all.find(
      (s) =>
        isLabProspectusRow(s) &&
        stripLecLabTitleSuffix(s.title) === baseTitle &&
        normalizeProspectusCode(s.code) !== norm,
    );
  return { lecCode: subjectCode, labCode: labRow?.code ?? null, mode: "lec" };
}

export function lecLabModesAvailable(
  programCode: string,
  subjectCode: string,
  extraRows?: ExtraSubjectRows,
): PlotLecLabMode[] {
  const { lecCode, labCode } = getLecLabPair(programCode, subjectCode, extraRows);
  if (lecCode && labCode) return ["lec", "lab"];
  const p = subjectCode ? subjectRowFor(programCode, subjectCode, extraRows) : undefined;
  // Unknown subject: offer lecture rather than nothing, or the plot cannot be completed at all.
  if (!p) return subjectCode ? ["lec"] : [];
  // Single catalog row carrying both lecture and lab contact hours.
  if (p.lecUnits > 0 && p.labUnits > 0) return ["lec", "lab"];
  if ((p.lecHours ?? 0) > 0 && (p.labHours ?? 0) > 0) return ["lec", "lab"];
  if (isLabProspectusRow(p)) return ["lab"];
  return ["lec"];
}

export function resolveSubjectCodeForLecLabMode(
  programCode: string,
  subjectCode: string,
  mode: PlotLecLabMode,
  extraRows?: ExtraSubjectRows,
): string {
  const pair = getLecLabPair(programCode, subjectCode, extraRows);
  if (mode === "lab" && pair.labCode) return pair.labCode;
  if (mode === "lec" && pair.lecCode) return pair.lecCode;
  return subjectCode;
}

/** Hide lab-only duplicate when a lecture code exists for the same pair. */
export function subjectRowsForPlotDropdown(
  programCode: string,
  rows: ProspectusSubjectRow[],
  extraRows?: ExtraSubjectRows,
): ProspectusSubjectRow[] {
  const out: ProspectusSubjectRow[] = [];
  for (const s of rows) {
    const pair = getLecLabPair(programCode, s.code, extraRows ?? rows);
    if (pair.lecCode && pair.labCode && pair.labCode === s.code && pair.lecCode !== s.code) continue;
    out.push(s);
  }
  return out;
}

/**
 * Subject dropdown label: base subject code/name only (no "(Lec)" / "(Lab)" twin options).
 * Lec/Lab is chosen via the separate control; plotting resolves the paired code.
 */
export function formatPlotSubjectDropdownLabel(row: { code: string; title?: string | null }): string {
  return row.code.trim();
}

export function formatLecLabDisplay(mode: PlotLecLabMode): string {
  return mode === "lab" ? "Laboratory" : "Lecture";
}

/** Prospectus slice for the plot modal — avoids empty subject lists when year parsing fails. */
/**
 * Subjects offered when plotting one section: the static prospectus PLUS anything the chairman added
 * in Subject Codes for the same program, year and semester.
 *
 * These two sources used to be either/or — the prospectus won whenever it held a single row — so a
 * subject added to a program that ships a CMO prospectus never reached the dropdown at all. A code
 * present in both is taken from Subject Codes, so an edit there is what gets plotted.
 */
export function subjectsForSectionPlot(args: {
  programCode: string;
  yearLevel: number | null;
  termSemester: BsitSemester | null;
  catalogRows?: ExtraSubjectRows;
}): ProspectusSubjectRow[] {
  const { yearLevel, termSemester } = args;
  const prospectus = prospectusSubjectsForSectionPlot(args);
  const extra = args.catalogRows ?? [];
  if (extra.length === 0) return prospectus;

  const byCode = new Map<string, ProspectusSubjectRow>();
  for (const r of prospectus) byCode.set(normalizeProspectusCode(r.code), r);

  const belongsToSection = (r: ProspectusSubjectRow) =>
    (yearLevel == null || r.yearLevel === yearLevel) &&
    (termSemester == null || r.semester === termSemester);

  for (const r of extra) {
    const key = normalizeProspectusCode(r.code);
    // Already offered here: swap in the catalog row so its edited units and hours are the ones used.
    // Its own year/semester is not re-checked — a blank semester in the catalog must not drop a
    // subject the prospectus places in this term.
    if (byCode.has(key)) {
      byCode.set(key, r);
      continue;
    }
    if (belongsToSection(r)) byCode.set(key, r);
  }
  return [...byCode.values()];
}

export function prospectusSubjectsForSectionPlot(args: {
  programCode: string;
  yearLevel: number | null;
  termSemester: BsitSemester | null;
}): ProspectusSubjectRow[] {
  const { programCode, yearLevel, termSemester } = args;
  if (yearLevel != null) {
    if (termSemester != null) {
      return prospectusSubjectsForProgramYearAndSemester(programCode, yearLevel, termSemester);
    }
    return prospectusSubjectsForProgramYearLevel(programCode, yearLevel);
  }
  if (termSemester != null) {
    const out: ProspectusSubjectRow[] = [];
    for (let yl = 1; yl <= 4; yl++) {
      out.push(...prospectusSubjectsForProgramYearAndSemester(programCode, yl, termSemester));
    }
    return out;
  }
  return getProspectusSubjectsForProgram(programCode);
}
