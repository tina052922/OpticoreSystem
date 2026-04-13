import type { ProspectusSubjectRow } from "@/lib/chairman/bsit-prospectus";
import { BSIT_PROSPECTUS_SUBJECTS } from "@/lib/chairman/bsit-prospectus";

/** One row in the GEC Chairman “predefined summary” (BSIT prospectus slice). */
export type BsitProspectusSummaryRow = ProspectusSubjectRow & {
  yearLevel: number;
  semester: 1 | 2;
};

export type BsitProspectusYearSemGroup = {
  key: string;
  yearLevel: number;
  semester: 1 | 2;
  label: string;
  subjects: BsitProspectusSummaryRow[];
};

/**
 * BSIT prospectus rows grouped for display (Year Level × Semester).
 * Used on the GEC Chairman evaluator above the plotting grid.
 */
export function groupBsitProspectusByYearAndSemester(): BsitProspectusYearSemGroup[] {
  const map = new Map<string, BsitProspectusSummaryRow[]>();
  for (const s of BSIT_PROSPECTUS_SUBJECTS) {
    const key = `${s.yearLevel}-${s.semester}`;
    const list = map.get(key) ?? [];
    list.push({ ...s, yearLevel: s.yearLevel, semester: s.semester });
    map.set(key, list);
  }
  const out: BsitProspectusYearSemGroup[] = [];
  for (const [key, subjects] of map) {
    const [yl, sem] = key.split("-");
    const yearLevel = parseInt(yl ?? "0", 10);
    const semester = (parseInt(sem ?? "1", 10) === 2 ? 2 : 1) as 1 | 2;
    subjects.sort((a, b) => a.code.localeCompare(b.code));
    out.push({
      key,
      yearLevel,
      semester,
      label: `Year ${yearLevel} · ${semester === 1 ? "1st" : "2nd"} Semester`,
      subjects,
    });
  }
  out.sort((a, b) => {
    if (a.yearLevel !== b.yearLevel) return a.yearLevel - b.yearLevel;
    return a.semester - b.semester;
  });
  return out;
}
