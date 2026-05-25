import { normalizeProspectusCode, type BsitSemester, type ProspectusSubjectRow } from "@/lib/chairman/bsit-prospectus";
import {
  getProspectusSubjectsForProgram,
  prospectusRowForProgram,
  prospectusSubjectsForProgramYearAndSemester,
  prospectusSubjectsForProgramYearLevel,
} from "@/lib/chairman/prospectus-registry";

export type PlotLecLabMode = "lec" | "lab";

export function inferLecLabMode(programCode: string, subjectCode: string): PlotLecLabMode {
  const p = prospectusRowForProgram(programCode, subjectCode);
  if (!p) return "lec";
  if (p.labUnits > 0 && p.lecUnits === 0) return "lab";
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

  if (mode === "lab") {
    const lecRow =
      all.find((s) => normalizeProspectusCode(s.code) + "L" === norm) ??
      all.find((s) => s.title.replace(/\s*\(Lab\)\s*/i, "").trim() === row.title.replace(/\s*\(Lab\)\s*/i, "").trim() && s.lecUnits > 0);
    return { lecCode: lecRow?.code ?? null, labCode: subjectCode, mode: "lab" };
  }

  const labRow =
    all.find((s) => normalizeProspectusCode(s.code) === norm + "L") ??
    all.find(
      (s) =>
        s.labUnits > 0 &&
        s.lecUnits === 0 &&
        s.title.replace(/\s*\(Lab\)\s*/i, "").trim() === row.title.replace(/\s*\(Lec\)\s*/i, "").trim(),
    );
  return { lecCode: subjectCode, labCode: labRow?.code ?? null, mode: "lec" };
}

export function lecLabModesAvailable(programCode: string, subjectCode: string): PlotLecLabMode[] {
  const { lecCode, labCode } = getLecLabPair(programCode, subjectCode);
  if (lecCode && labCode) return ["lec", "lab"];
  const p = subjectCode ? prospectusRowForProgram(programCode, subjectCode) : undefined;
  if (!p) return [];
  if (p.labUnits > 0 && p.lecUnits === 0) return ["lab"];
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
