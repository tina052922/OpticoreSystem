/**
 * BS Environmental Science (CAFE) — CMO No. 35, s. 2005 · effective A.Y. 2026–2027 (CTU Argao).
 *
 * `code` values use a `BSENVS-` prefix so `public."Subject".code` stays globally unique alongside other programs.
 * Titles follow the official curriculum descriptive titles.
 */

import type { BsitSemester, ProspectusSubjectRow } from "@/lib/chairman/bsit-prospectus";

export const BSENVS_PROGRAM_CODE = "BSENVS";

/** Seed `Program.id` (see supabase/seed_ctu_argao_bs_envsci.sql). */
export const BSENVS_PROGRAM_ID = "prog-bs-envsci";

export const BSENVS_SECTION_NAMES = ["BSENVS-1A", "BSENVS-1B", "BSENVS-2A", "BSENVS-2B", "BSENVS-3A", "BSENVS-4A"] as const;

export const BSENVS_PROSPECTUS_SUBJECTS: ProspectusSubjectRow[] = [
  // First Year — 1st Semester
  { code: "BSENVS-ENCSC111", title: "Inorganic Chemistry (Lec)", lecUnits: 3, lecHours: 3, labUnits: 0, labHours: 0, yearLevel: 1, semester: 1 },
  { code: "BSENVS-ENCSC111L", title: "Inorganic Chemistry (Lab)", lecUnits: 2, lecHours: 0, labUnits: 0, labHours: 6, yearLevel: 1, semester: 1 },
  { code: "BSENVS-GEC-MMW", title: "Mathematics in the Modern World", lecUnits: 3, lecHours: 3, labUnits: 0, labHours: 0, yearLevel: 1, semester: 1 },
  { code: "BSENVS-GEC-US", title: "Understanding the Self", lecUnits: 3, lecHours: 3, labUnits: 0, labHours: 0, yearLevel: 1, semester: 1 },
  { code: "BSENVS-GEC-PC", title: "Purposive Communication", lecUnits: 3, lecHours: 3, labUnits: 0, labHours: 0, yearLevel: 1, semester: 1 },
  { code: "BSENVS-GEC-RPH", title: "Readings in Philippine History", lecUnits: 3, lecHours: 3, labUnits: 0, labHours: 0, yearLevel: 1, semester: 1 },
  { code: "BSENVS-PATHFIT-1", title: "Physical Activities Towards Health and Fitness 1", lecUnits: 2, lecHours: 2, labUnits: 0, labHours: 0, yearLevel: 1, semester: 1 },
  { code: "BSENVS-NSTP-1", title: "National Service Training Program 1", lecUnits: 3, lecHours: 3, labUnits: 0, labHours: 0, yearLevel: 1, semester: 1 },
  // First Year — 2nd Semester
  { code: "BSENVS-ENCSC122", title: "Organic Chemistry (Lec)", lecUnits: 3, lecHours: 3, labUnits: 0, labHours: 0, yearLevel: 1, semester: 2 },
  { code: "BSENVS-ENCSC122L", title: "Organic Chemistry (Lab)", lecUnits: 2, lecHours: 0, labUnits: 0, labHours: 6, yearLevel: 1, semester: 2 },
  { code: "BSENVS-ENCSM123", title: "College Algebra", lecUnits: 3, lecHours: 3, labUnits: 0, labHours: 0, yearLevel: 1, semester: 2 },
  { code: "BSENVS-GEC-STS", title: "Science, Technology and Society", lecUnits: 3, lecHours: 3, labUnits: 0, labHours: 0, yearLevel: 1, semester: 2 },
  { code: "BSENVS-GEC-AA", title: "Art Appreciation", lecUnits: 3, lecHours: 3, labUnits: 0, labHours: 0, yearLevel: 1, semester: 2 },
  { code: "BSENVS-GEC-LIE", title: "Living in the IT Era", lecUnits: 3, lecHours: 3, labUnits: 0, labHours: 0, yearLevel: 1, semester: 2 },
  { code: "BSENVS-GEC-TCW", title: "The Contemporary World", lecUnits: 3, lecHours: 3, labUnits: 0, labHours: 0, yearLevel: 1, semester: 2 },
  { code: "BSENVS-PATHFIT-2", title: "Physical Activities Towards Health and Fitness 2", lecUnits: 2, lecHours: 2, labUnits: 0, labHours: 0, yearLevel: 1, semester: 2 },
  { code: "BSENVS-NSTP-2", title: "National Service Training Program 2", lecUnits: 3, lecHours: 3, labUnits: 0, labHours: 0, yearLevel: 1, semester: 2 },
  // Second Year — 1st Semester
  { code: "BSENVS-ENCSC214", title: "Analytical Chemistry (Lec)", lecUnits: 3, lecHours: 3, labUnits: 0, labHours: 0, yearLevel: 2, semester: 1 },
  { code: "BSENVS-ENCSC214L", title: "Analytical Chemistry (Lab)", lecUnits: 2, lecHours: 0, labUnits: 0, labHours: 6, yearLevel: 2, semester: 1 },
  { code: "BSENVS-ENCSM215", title: "Trigonometry", lecUnits: 3, lecHours: 3, labUnits: 0, labHours: 0, yearLevel: 2, semester: 1 },
  { code: "BSENVS-GEC-E", title: "Ethics", lecUnits: 3, lecHours: 3, labUnits: 0, labHours: 0, yearLevel: 2, semester: 1 },
  { code: "BSENVS-GEE-PIC", title: "Philippine Indigenous Communities", lecUnits: 3, lecHours: 3, labUnits: 0, labHours: 0, yearLevel: 2, semester: 1 },
  { code: "BSENVS-GEE-GSPS", title: "Gender & Society with Peace Studies", lecUnits: 3, lecHours: 3, labUnits: 0, labHours: 0, yearLevel: 2, semester: 1 },
  { code: "BSENVS-GEC-LWR", title: "Life and Works of Rizal", lecUnits: 3, lecHours: 3, labUnits: 0, labHours: 0, yearLevel: 2, semester: 1 },
  { code: "BSENVS-PATHFIT-3", title: "Physical Activities Towards Health and Fitness 3", lecUnits: 2, lecHours: 2, labUnits: 0, labHours: 0, yearLevel: 2, semester: 1 },
  // Second Year — 2nd Semester
  { code: "BSENVS-ENCSB227", title: "General Biology (Lec)", lecUnits: 3, lecHours: 3, labUnits: 0, labHours: 0, yearLevel: 2, semester: 2 },
  { code: "BSENVS-ENCSB227L", title: "General Biology (Lab)", lecUnits: 2, lecHours: 0, labUnits: 0, labHours: 6, yearLevel: 2, semester: 2 },
  { code: "BSENVS-ENCSM228", title: "Calculus", lecUnits: 3, lecHours: 3, labUnits: 0, labHours: 0, yearLevel: 2, semester: 2 },
  { code: "BSENVS-ENCSE229", title: "Geology and Soil Science", lecUnits: 3, lecHours: 3, labUnits: 0, labHours: 0, yearLevel: 2, semester: 2 },
  { code: "BSENVS-ENCSP2210", title: "Mechanics and Thermodynamics (Lec)", lecUnits: 3, lecHours: 3, labUnits: 0, labHours: 0, yearLevel: 2, semester: 2 },
  { code: "BSENVS-ENCSP2210L", title: "Mechanics and Thermodynamics (Lab)", lecUnits: 2, lecHours: 0, labUnits: 0, labHours: 6, yearLevel: 2, semester: 2 },
  { code: "BSENVS-ENM221", title: "Waste Management", lecUnits: 3, lecHours: 3, labUnits: 0, labHours: 0, yearLevel: 2, semester: 2 },
  { code: "BSENVS-GEE-PEE", title: "People and the Earth's Ecosystem", lecUnits: 3, lecHours: 3, labUnits: 0, labHours: 0, yearLevel: 2, semester: 2 },
  { code: "BSENVS-PATHFIT-4", title: "Physical Activities Towards Health and Fitness 4", lecUnits: 2, lecHours: 2, labUnits: 0, labHours: 0, yearLevel: 2, semester: 2 },
  // Third Year — 1st Semester
  { code: "BSENVS-ENCSB3111", title: "Genetics (Lec)", lecUnits: 3, lecHours: 3, labUnits: 0, labHours: 0, yearLevel: 3, semester: 1 },
  { code: "BSENVS-ENCSB3111L", title: "Genetics (Lab)", lecUnits: 2, lecHours: 0, labUnits: 0, labHours: 6, yearLevel: 3, semester: 1 },
  { code: "BSENVS-ENCSM3112", title: "Environmental Statistics (Lec)", lecUnits: 2, lecHours: 2, labUnits: 0, labHours: 0, yearLevel: 3, semester: 1 },
  { code: "BSENVS-ENCSM3112L", title: "Environmental Statistics (Lab)", lecUnits: 1, lecHours: 0, labUnits: 0, labHours: 3, yearLevel: 3, semester: 1 },
  { code: "BSENVS-ENCSE3113", title: "Freshwater Resources Management (Lec)", lecUnits: 2, lecHours: 2, labUnits: 0, labHours: 0, yearLevel: 3, semester: 1 },
  { code: "BSENVS-ENCSE3113L", title: "Freshwater Resources Management (Lab)", lecUnits: 1, lecHours: 0, labUnits: 0, labHours: 3, yearLevel: 3, semester: 1 },
  { code: "BSENVS-ENS312", title: "Biodiversity Conservation (Lec)", lecUnits: 2, lecHours: 2, labUnits: 0, labHours: 0, yearLevel: 3, semester: 1 },
  { code: "BSENVS-ENS312L", title: "Biodiversity Conservation (Lab)", lecUnits: 1, lecHours: 0, labUnits: 0, labHours: 3, yearLevel: 3, semester: 1 },
  { code: "BSENVS-ENS313", title: "Soil and Water Conservation (Lec)", lecUnits: 2, lecHours: 2, labUnits: 0, labHours: 0, yearLevel: 3, semester: 1 },
  { code: "BSENVS-ENS313L", title: "Soil and Water Conservation (Lab)", lecUnits: 1, lecHours: 0, labUnits: 0, labHours: 3, yearLevel: 3, semester: 1 },
  // Third Year — 2nd Semester
  { code: "BSENVS-ENCSB3214", title: "General Ecology (Lec)", lecUnits: 3, lecHours: 3, labUnits: 0, labHours: 0, yearLevel: 3, semester: 2 },
  { code: "BSENVS-ENCSB3214L", title: "General Ecology (Lab)", lecUnits: 2, lecHours: 0, labUnits: 0, labHours: 6, yearLevel: 3, semester: 2 },
  { code: "BSENVS-ENM323", title: "Watershed Management (Lec)", lecUnits: 2, lecHours: 2, labUnits: 0, labHours: 0, yearLevel: 3, semester: 2 },
  { code: "BSENVS-ENM323L", title: "Watershed Management (Lab)", lecUnits: 1, lecHours: 0, labUnits: 0, labHours: 3, yearLevel: 3, semester: 2 },
  { code: "BSENVS-ENM324", title: "Coastal and Marine Management (Lec)", lecUnits: 2, lecHours: 2, labUnits: 0, labHours: 0, yearLevel: 3, semester: 2 },
  { code: "BSENVS-ENM324L", title: "Coastal and Marine Management (Lab)", lecUnits: 1, lecHours: 0, labUnits: 0, labHours: 3, yearLevel: 3, semester: 2 },
  { code: "BSENVS-ENS315", title: "Environmental Chemistry (Lec)", lecUnits: 2, lecHours: 2, labUnits: 0, labHours: 0, yearLevel: 3, semester: 2 },
  { code: "BSENVS-ENS315L", title: "Environmental Chemistry (Lab)", lecUnits: 1, lecHours: 0, labUnits: 0, labHours: 3, yearLevel: 3, semester: 2 },
  { code: "BSENVS-ENS316", title: "Research Methods with GIS", lecUnits: 3, lecHours: 3, labUnits: 0, labHours: 0, yearLevel: 3, semester: 2 },
  // Fourth Year — 1st Semester
  { code: "BSENVS-EIA", title: "The EIA System (Lec)", lecUnits: 2, lecHours: 2, labUnits: 0, labHours: 0, yearLevel: 4, semester: 1 },
  { code: "BSENVS-EIAL", title: "The EIA System (Lab)", lecUnits: 1, lecHours: 0, labUnits: 0, labHours: 3, yearLevel: 4, semester: 1 },
  { code: "BSENVS-ENM415", title: "Environmental Auditing (Lec)", lecUnits: 2, lecHours: 2, labUnits: 0, labHours: 0, yearLevel: 4, semester: 1 },
  { code: "BSENVS-ENM415L", title: "Environmental Auditing (Lab)", lecUnits: 1, lecHours: 0, labUnits: 0, labHours: 3, yearLevel: 4, semester: 1 },
  { code: "BSENVS-THESIS1", title: "Thesis Proposal", lecUnits: 3, lecHours: 3, labUnits: 0, labHours: 0, yearLevel: 4, semester: 1 },
  // Fourth Year — 2nd Semester
  { code: "BSENVS-ENS428", title: "Environmental Monitoring (Lec)", lecUnits: 3, lecHours: 3, labUnits: 0, labHours: 0, yearLevel: 4, semester: 2 },
  { code: "BSENVS-ENS428L", title: "Environmental Monitoring (Lab)", lecUnits: 2, lecHours: 0, labUnits: 0, labHours: 6, yearLevel: 4, semester: 2 },
  { code: "BSENVS-THESIS2", title: "Thesis Writing 2", lecUnits: 3, lecHours: 3, labUnits: 0, labHours: 0, yearLevel: 4, semester: 2 },
];

const byCode = new Map<string, ProspectusSubjectRow>();
for (const s of BSENVS_PROSPECTUS_SUBJECTS) {
  byCode.set(s.code.replace(/\s+/g, "").replace(/-/g, "").toUpperCase(), s);
}

export function prospectusByCodeBsenvs(code: string): ProspectusSubjectRow | undefined {
  const n = code.replace(/\s+/g, "").replace(/-/g, "").toUpperCase();
  return byCode.get(n);
}

export function prospectusSubjectsForBsenvsYearLevel(yearLevel: number): ProspectusSubjectRow[] {
  return BSENVS_PROSPECTUS_SUBJECTS.filter((s) => s.yearLevel === yearLevel);
}

export function prospectusSubjectsForBsenvsYearAndSemester(yearLevel: number, semester: BsitSemester): ProspectusSubjectRow[] {
  return BSENVS_PROSPECTUS_SUBJECTS.filter((s) => s.yearLevel === yearLevel && s.semester === semester);
}
