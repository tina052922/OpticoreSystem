/**
 * BSIT curriculum scope (CMO No. 25 s. 2015, effective A.Y. 2023–2024).
 * Used to lock Chairman scheduling UI to official sections, rooms, and course codes.
 */

export const BSIT_PROGRAM_CODE = "BSIT";

/** Section names as used in scheduling (must align with seed `Section.name`). */
export const BSIT_SECTION_NAMES = [
  "BSIT-1A",
  "BSIT-1B",
  "BSIT-1C",
  "BSIT-2A",
  "BSIT-2B",
  "BSIT-3A",
  "BSIT-3B",
  "BSIT-4A",
  "BSIT-4B",
] as const;

/** Room labels for BSIT lab plotting (must align with seed `Room.code`). */
export const BSIT_SCHEDULING_ROOM_CODES = ["IT LAB 1", "IT LAB 2", "IT LAB 3", "IT LAB 4"] as const;

export type BsitSemester = 1 | 2;

export type ProspectusSubjectRow = {
  code: string;
  title: string;
  lecUnits: number;
  lecHours: number;
  labUnits: number;
  labHours: number;
  yearLevel: number;
  semester: BsitSemester;
};

/** Official prospectus rows for Subject Codes UI and client-side validation. */
export const BSIT_PROSPECTUS_SUBJECTS: ProspectusSubjectRow[] = [
  // First Year – 1st Semester
  { code: "GEC-RPH", title: "Readings in Philippine History", lecUnits: 3, lecHours: 3, labUnits: 0, labHours: 0, yearLevel: 1, semester: 1 },
  { code: "GEC-MMW", title: "Mathematics in the Modern World", lecUnits: 3, lecHours: 3, labUnits: 0, labHours: 0, yearLevel: 1, semester: 1 },
  { code: "GEE-TEM", title: "The Entrepreneurial Mind", lecUnits: 3, lecHours: 3, labUnits: 0, labHours: 0, yearLevel: 1, semester: 1 },
  { code: "CC-111", title: "Introduction to Computing", lecUnits: 3, lecHours: 3, labUnits: 0, labHours: 0, yearLevel: 1, semester: 1 },
  { code: "CC-112", title: "Computer Programming 1 (Lec)", lecUnits: 2, lecHours: 2, labUnits: 0, labHours: 0, yearLevel: 1, semester: 1 },
  { code: "CC-112L", title: "Computer Programming 1 (Lab)", lecUnits: 0, lecHours: 0, labUnits: 3, labHours: 9, yearLevel: 1, semester: 1 },
  { code: "AP-1", title: "Multimedia", lecUnits: 3, lecHours: 3, labUnits: 0, labHours: 0, yearLevel: 1, semester: 1 },
  { code: "PATHFIT-1", title: "Physical Activities Towards Health and Fitness 1", lecUnits: 2, lecHours: 2, labUnits: 0, labHours: 0, yearLevel: 1, semester: 1 },
  { code: "NSTP-1", title: "National Service Training Program 1", lecUnits: 3, lecHours: 3, labUnits: 0, labHours: 0, yearLevel: 1, semester: 1 },
  // First Year – 2nd Semester
  { code: "GEC-PC", title: "Purposive Communication", lecUnits: 3, lecHours: 3, labUnits: 0, labHours: 0, yearLevel: 1, semester: 2 },
  { code: "GEC-STS", title: "Science, Technology and Society", lecUnits: 3, lecHours: 3, labUnits: 0, labHours: 0, yearLevel: 1, semester: 2 },
  { code: "GEC-US", title: "Understanding the Self", lecUnits: 3, lecHours: 3, labUnits: 0, labHours: 0, yearLevel: 1, semester: 2 },
  { code: "GEE-GSPS", title: "Gender and Society with Peace Studies", lecUnits: 3, lecHours: 3, labUnits: 0, labHours: 0, yearLevel: 1, semester: 2 },
  { code: "CC-123", title: "Computer Programming 2 (Lec)", lecUnits: 2, lecHours: 2, labUnits: 0, labHours: 0, yearLevel: 1, semester: 2 },
  { code: "CC-123L", title: "Computer Programming 2 (Lab)", lecUnits: 0, lecHours: 0, labUnits: 3, labHours: 9, yearLevel: 1, semester: 2 },
  { code: "PC-121", title: "Discrete Mathematics", lecUnits: 3, lecHours: 3, labUnits: 0, labHours: 0, yearLevel: 1, semester: 2 },
  { code: "AP-2", title: "Digital Logic Design", lecUnits: 3, lecHours: 3, labUnits: 0, labHours: 0, yearLevel: 1, semester: 2 },
  { code: "PATHFIT-2", title: "Physical Activities Towards Health and Fitness 2", lecUnits: 2, lecHours: 2, labUnits: 0, labHours: 0, yearLevel: 1, semester: 2 },
  { code: "NSTP-2", title: "National Service Training Program 2", lecUnits: 3, lecHours: 3, labUnits: 0, labHours: 0, yearLevel: 1, semester: 2 },
  // Second Year – 1st Semester
  { code: "GEC-E", title: "Ethics", lecUnits: 3, lecHours: 3, labUnits: 0, labHours: 0, yearLevel: 2, semester: 1 },
  { code: "GEE-ES", title: "Environmental Science", lecUnits: 3, lecHours: 3, labUnits: 0, labHours: 0, yearLevel: 2, semester: 1 },
  { code: "GEC-LWR", title: "Life and Works of Rizal", lecUnits: 3, lecHours: 3, labUnits: 0, labHours: 0, yearLevel: 2, semester: 1 },
  { code: "PC-212", title: "Quantitative Methods (Modeling & Simulation)", lecUnits: 3, lecHours: 3, labUnits: 0, labHours: 0, yearLevel: 2, semester: 1 },
  { code: "CC-214", title: "Data Structures and Algorithms (Lec)", lecUnits: 2, lecHours: 2, labUnits: 0, labHours: 0, yearLevel: 2, semester: 1 },
  { code: "CC-214L", title: "Data Structures and Algorithms (Lab)", lecUnits: 0, lecHours: 0, labUnits: 3, labHours: 9, yearLevel: 2, semester: 1 },
  { code: "P-ELEC-1", title: "Object-Oriented Programming", lecUnits: 3, lecHours: 3, labUnits: 0, labHours: 0, yearLevel: 2, semester: 1 },
  { code: "P-ELEC-2", title: "Web Systems and Technologies", lecUnits: 3, lecHours: 3, labUnits: 0, labHours: 0, yearLevel: 2, semester: 1 },
  { code: "PATHFIT-3", title: "Physical Activities Towards Health and Fitness 3", lecUnits: 2, lecHours: 2, labUnits: 0, labHours: 0, yearLevel: 2, semester: 1 },
  // Second Year – 2nd Semester
  { code: "GEC-TCW", title: "The Contemporary World", lecUnits: 3, lecHours: 3, labUnits: 0, labHours: 0, yearLevel: 2, semester: 2 },
  { code: "PC-223", title: "Integrative Programming and Technologies 1", lecUnits: 3, lecHours: 3, labUnits: 0, labHours: 0, yearLevel: 2, semester: 2 },
  { code: "PC-224", title: "Networking 1", lecUnits: 3, lecHours: 3, labUnits: 0, labHours: 0, yearLevel: 2, semester: 2 },
  { code: "CC-225", title: "Information Management (Lec)", lecUnits: 2, lecHours: 2, labUnits: 0, labHours: 0, yearLevel: 2, semester: 2 },
  { code: "CC-225L", title: "Information Management (Lab)", lecUnits: 0, lecHours: 0, labUnits: 3, labHours: 9, yearLevel: 2, semester: 2 },
  { code: "P-ELEC-3", title: "Platform Technologies", lecUnits: 3, lecHours: 3, labUnits: 0, labHours: 0, yearLevel: 2, semester: 2 },
  { code: "AP-3", title: "ASP.NET", lecUnits: 3, lecHours: 3, labUnits: 0, labHours: 0, yearLevel: 2, semester: 2 },
  { code: "PATHFIT-4", title: "Physical Activities Towards Health and Fitness 4", lecUnits: 2, lecHours: 2, labUnits: 0, labHours: 0, yearLevel: 2, semester: 2 },
  // Third Year – 1st Semester
  { code: "GEE-FE", title: "Functional English", lecUnits: 3, lecHours: 3, labUnits: 0, labHours: 0, yearLevel: 3, semester: 1 },
  { code: "PC-315", title: "Networking 2 (Lec)", lecUnits: 2, lecHours: 2, labUnits: 0, labHours: 0, yearLevel: 3, semester: 1 },
  { code: "PC-315L", title: "Networking 2 (Lab)", lecUnits: 0, lecHours: 0, labUnits: 3, labHours: 9, yearLevel: 3, semester: 1 },
  { code: "PC-316", title: "Systems Integration and Architecture 1", lecUnits: 3, lecHours: 3, labUnits: 0, labHours: 0, yearLevel: 3, semester: 1 },
  { code: "PC-317", title: "Introduction to Human Computer Interaction", lecUnits: 3, lecHours: 3, labUnits: 0, labHours: 0, yearLevel: 3, semester: 1 },
  { code: "PC-3180", title: "Database Management Systems", lecUnits: 3, lecHours: 3, labUnits: 0, labHours: 0, yearLevel: 3, semester: 1 },
  { code: "CC-316", title: "Applications Development and Emerging Technologies", lecUnits: 3, lecHours: 3, labUnits: 0, labHours: 0, yearLevel: 3, semester: 1 },
  // Third Year – 2nd Semester
  { code: "GEC-AA", title: "Art Appreciation", lecUnits: 3, lecHours: 3, labUnits: 0, labHours: 0, yearLevel: 3, semester: 2 },
  { code: "GEE-PEE", title: "People and the Earth's Ecosystems", lecUnits: 3, lecHours: 3, labUnits: 0, labHours: 0, yearLevel: 3, semester: 2 },
  { code: "PC-329", title: "Capstone Project and Research 1", lecUnits: 3, lecHours: 3, labUnits: 0, labHours: 0, yearLevel: 3, semester: 2 },
  { code: "PC-3210", title: "Social and Professional Issues", lecUnits: 3, lecHours: 3, labUnits: 0, labHours: 0, yearLevel: 3, semester: 2 },
  { code: "PC-3211", title: "Information Assurance and Security 1 (Lec)", lecUnits: 2, lecHours: 2, labUnits: 0, labHours: 0, yearLevel: 3, semester: 2 },
  { code: "PC-3211L", title: "Information Assurance and Security 1 (Lab)", lecUnits: 0, lecHours: 0, labUnits: 3, labHours: 9, yearLevel: 3, semester: 2 },
  { code: "AP-4", title: "iOS Mobile Application Development", lecUnits: 3, lecHours: 3, labUnits: 0, labHours: 0, yearLevel: 3, semester: 2 },
  { code: "AP-5", title: "Technology and the Application of the Internet of Things", lecUnits: 3, lecHours: 3, labUnits: 0, labHours: 0, yearLevel: 3, semester: 2 },
  // Fourth Year – 1st Semester
  { code: "PC-4112", title: "Information Assurance and Security 2 (Lec)", lecUnits: 2, lecHours: 2, labUnits: 0, labHours: 0, yearLevel: 4, semester: 1 },
  { code: "PC-4112L", title: "Information Assurance and Security 2 (Lab)", lecUnits: 0, lecHours: 0, labUnits: 3, labHours: 9, yearLevel: 4, semester: 1 },
  { code: "PC-4113", title: "Systems Administration and Maintenance", lecUnits: 3, lecHours: 3, labUnits: 0, labHours: 0, yearLevel: 4, semester: 1 },
  { code: "PC-4114", title: "Capstone Project and Research 2", lecUnits: 3, lecHours: 3, labUnits: 0, labHours: 0, yearLevel: 4, semester: 1 },
  { code: "P-ELEC-4", title: "Systems Integration and Architecture 2", lecUnits: 3, lecHours: 3, labUnits: 0, labHours: 0, yearLevel: 4, semester: 1 },
  { code: "AP-6", title: "Cross-Platform Script Development Technology", lecUnits: 3, lecHours: 3, labUnits: 0, labHours: 0, yearLevel: 4, semester: 1 },
  // Fourth Year – 2nd Semester
  { code: "PC-4215", title: "On-the-Job Training (OJT)", lecUnits: 0, lecHours: 0, labUnits: 9, labHours: 27, yearLevel: 4, semester: 2 },
];

const prospectusCodeSet = new Set(BSIT_PROSPECTUS_SUBJECTS.map((s) => normalizeProspectusCode(s.code)));

/** Normalize for comparison with DB `Subject.code` (hyphens, case). */
export function normalizeProspectusCode(code: string): string {
  return code.replace(/\s+/g, "").toUpperCase();
}

export function isBsitChairmanProgram(programCode: string | null | undefined): boolean {
  return (programCode ?? "").toUpperCase() === BSIT_PROGRAM_CODE;
}

export function isProspectusSubjectCode(code: string): boolean {
  return prospectusCodeSet.has(normalizeProspectusCode(code));
}

export function isBsitSectionName(name: string): boolean {
  const n = name.trim().replace(/\s+/g, "-").replace(/-+/g, "-").toUpperCase();
  return (BSIT_SECTION_NAMES as readonly string[]).includes(n);
}

export function isBsitSchedulingRoomCode(code: string): boolean {
  return (BSIT_SCHEDULING_ROOM_CODES as readonly string[]).includes(code.trim());
}

/** Map section name (e.g. BSIT-1A) to curriculum year level (1–4) for prospectus filtering. */
export function yearLevelFromBsitSectionName(name: string): number | null {
  const n = name.trim().replace(/\s+/g, "-").replace(/-+/g, "-").toUpperCase();
  if (n.startsWith("BSIT-1")) return 1;
  if (n.startsWith("BSIT-2")) return 2;
  if (n.startsWith("BSIT-3")) return 3;
  if (n.startsWith("BSIT-4")) return 4;
  return null;
}

export function prospectusSubjectsForYearLevel(yearLevel: number): ProspectusSubjectRow[] {
  return BSIT_PROSPECTUS_SUBJECTS.filter((s) => s.yearLevel === yearLevel);
}

export function prospectusSubjectsForYearAndSemester(yearLevel: number, semester: BsitSemester): ProspectusSubjectRow[] {
  return BSIT_PROSPECTUS_SUBJECTS.filter((s) => s.yearLevel === yearLevel && s.semester === semester);
}

/** How many 1-hour grid slots this row occupies (labs span by lab units; lec-only = 1 slot per row). */
export function scheduleDurationSlots(p: ProspectusSubjectRow): number {
  if (p.labUnits > 0) return Math.min(10, Math.max(1, Math.round(p.labUnits)));
  return 1;
}
