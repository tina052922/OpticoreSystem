import type { ProspectusSubjectRow } from "@/lib/chairman/bsit-prospectus";

/** One row in the program prospectus summary table. */
export type ProspectusSummaryRow = ProspectusSubjectRow & {
  yearLevel: number;
  semester: 1 | 2;
};

export type ProspectusYearSemGroup = {
  key: string;
  yearLevel: number;
  semester: 1 | 2;
  label: string;
  subjects: ProspectusSummaryRow[];
};

/** One year-level bucket (1st + 2nd sem subjects together) for the GEC Chairman “by year only” summary. */
export type ProspectusYearLevelGroup = {
  yearLevel: number;
  label: string;
  subjects: ProspectusSummaryRow[];
};

/**
 * Group any program’s static prospectus rows for the GEC Chairman summary UI (Year Level × Semester).
 */
export function groupProspectusByYearAndSemester(subjects: ProspectusSubjectRow[]): ProspectusYearSemGroup[] {
  if (subjects.length === 0) return [];
  const map = new Map<string, ProspectusSummaryRow[]>();
  for (const s of subjects) {
    const key = `${s.yearLevel}-${s.semester}`;
    const list = map.get(key) ?? [];
    list.push({ ...s, yearLevel: s.yearLevel, semester: s.semester });
    map.set(key, list);
  }
  const out: ProspectusYearSemGroup[] = [];
  for (const [key, subjList] of map) {
    const [yl, sem] = key.split("-");
    const yearLevel = parseInt(yl ?? "0", 10);
    const semester = (parseInt(sem ?? "1", 10) === 2 ? 2 : 1) as 1 | 2;
    subjList.sort((a, b) => a.code.localeCompare(b.code));
    out.push({
      key,
      yearLevel,
      semester,
      label: `Year ${yearLevel} · ${semester === 1 ? "1st" : "2nd"} Semester`,
      subjects: subjList,
    });
  }
  out.sort((a, b) => {
    if (a.yearLevel !== b.yearLevel) return a.yearLevel - b.yearLevel;
    return a.semester - b.semester;
  });
  return out;
}

/**
 * Group prospectus rows by **year level only** (both semesters in one block), sorted by semester then code.
 * Used when the UI should not split the table by semester.
 */
export function groupProspectusByYearLevelOnly(subjects: ProspectusSubjectRow[]): ProspectusYearLevelGroup[] {
  if (subjects.length === 0) return [];
  const map = new Map<number, ProspectusSummaryRow[]>();
  for (const s of subjects) {
    const list = map.get(s.yearLevel) ?? [];
    list.push({ ...s, yearLevel: s.yearLevel, semester: s.semester });
    map.set(s.yearLevel, list);
  }
  const out: ProspectusYearLevelGroup[] = [];
  for (const [yearLevel, subjList] of map) {
    subjList.sort((a, b) => {
      if (a.semester !== b.semester) return a.semester - b.semester;
      return a.code.localeCompare(b.code);
    });
    out.push({
      yearLevel,
      label: `Year ${yearLevel}`,
      subjects: subjList,
    });
  }
  out.sort((a, b) => a.yearLevel - b.yearLevel);
  return out;
}
