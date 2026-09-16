import { normalizeProspectusCode, type BsitSemester, type ProspectusSubjectRow } from "@/lib/chairman/bsit-prospectus";
import {
  getProspectusSubjectsForProgram,
  prospectusRowForProgram,
  prospectusSubjectsForProgramYearAndSemester,
  prospectusSubjectsForProgramYearLevel,
} from "@/lib/chairman/prospectus-registry";

export type PlotLecLabMode = "lec" | "lab";

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

export function inferLecLabMode(programCode: string, subjectCode: string): PlotLecLabMode {
  if (!subjectCode) return "lec";
  const p = prospectusRowForProgram(programCode, subjectCode);
  const all = getProspectusSubjectsForProgram(programCode);
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
): { lecCode: string | null; labCode: string | null; mode: PlotLecLabMode } {
  const row = subjectCode ? prospectusRowForProgram(programCode, subjectCode) : undefined;
  if (!row || !subjectCode) {
    return { lecCode: null, labCode: null, mode: "lec" };
  }
  const all = getProspectusSubjectsForProgram(programCode);
  const norm = normalizeProspectusCode(subjectCode);
  const mode = inferLecLabMode(programCode, subjectCode);
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

export function lecLabModesAvailable(programCode: string, subjectCode: string): PlotLecLabMode[] {
  const { lecCode, labCode } = getLecLabPair(programCode, subjectCode);
  if (lecCode && labCode) return ["lec", "lab"];
  const p = subjectCode ? prospectusRowForProgram(programCode, subjectCode) : undefined;
  if (!p) return [];
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
): string {
  const pair = getLecLabPair(programCode, subjectCode);
  if (mode === "lab" && pair.labCode) return pair.labCode;
  if (mode === "lec" && pair.lecCode) return pair.lecCode;
  return subjectCode;
}

/** Hide lab-only duplicate when a lecture code exists for the same pair. */
export function subjectRowsForPlotDropdown(
  programCode: string,
  rows: ProspectusSubjectRow[],
): ProspectusSubjectRow[] {
  const out: ProspectusSubjectRow[] = [];
  for (const s of rows) {
    const pair = getLecLabPair(programCode, s.code);
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
