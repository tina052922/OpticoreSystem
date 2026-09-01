import { prospectusRowForProgram } from "@/lib/chairman/prospectus-registry";

/**
 * Weekly contact hours required for a subject in the term (prospectus lec+lab).
 * CHED prospectus hours are weekly for the semester offering — plotted meetings
 * for the same section + subject code must not exceed this total.
 */
export function requiredWeeklyContactHours(args: {
  programCode?: string | null;
  subjectCode?: string | null;
  lecHours?: number | null;
  labHours?: number | null;
}): number {
  const code = args.subjectCode?.trim();
  if (code) {
    const p = prospectusRowForProgram(args.programCode, code);
    if (p) return Math.max(0, (p.lecHours ?? 0) + (p.labHours ?? 0));
  }
  return Math.max(0, (args.lecHours ?? 0) + (args.labHours ?? 0));
}

export type SubjectHourMeeting = {
  id: string;
  sectionId: string;
  subjectCode: string;
  hours: number;
};

export function plottedHoursForSubjectSection(args: {
  meetings: SubjectHourMeeting[];
  sectionId: string;
  subjectCode: string;
  excludeId?: string;
}): number {
  const sectionId = args.sectionId.trim();
  const code = args.subjectCode.trim().toUpperCase();
  if (!sectionId || !code) return 0;
  let sum = 0;
  for (const m of args.meetings) {
    if (args.excludeId && m.id === args.excludeId) continue;
    if (m.sectionId !== sectionId) continue;
    if (m.subjectCode.trim().toUpperCase() !== code) continue;
    sum += Math.max(0, m.hours);
  }
  return sum;
}

export function hoursExceedSubjectRequirement(args: {
  requiredHours: number;
  alreadyPlottedHours: number;
  additionalHours: number;
}): boolean {
  if (args.requiredHours <= 0) return false;
  return args.alreadyPlottedHours + args.additionalHours > args.requiredHours + 1e-6;
}

export function subjectHoursOverLimitMessage(args: {
  subjectCode: string;
  requiredHours: number;
  alreadyPlottedHours: number;
  additionalHours: number;
}): string {
  const total = args.alreadyPlottedHours + args.additionalHours;
  return `${args.subjectCode} is plotted for ${total} hour(s) this term; the subject requires ${args.requiredHours} hour(s) per week for the semester. Reduce duration or remove extra meetings before saving.`;
}
