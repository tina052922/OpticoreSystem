import { prospectusRowForProgram } from "@/lib/chairman/prospectus-registry";
import { weeklyContactHoursFromUnits } from "@/lib/subjects/contact-hours";

/**
 * Weekly contact hours required for a subject in the term.
 * Lecture: 1 unit = 1 hour. Laboratory: 1 unit = 3 hours.
 */
export function requiredWeeklyContactHours(args: {
  programCode?: string | null;
  subjectCode?: string | null;
  lecUnits?: number | null;
  labUnits?: number | null;
  lecHours?: number | null;
  labHours?: number | null;
}): number {
  const code = args.subjectCode?.trim();
  if (code) {
    const p = prospectusRowForProgram(args.programCode, code);
    if (p) return weeklyContactHoursFromUnits(p.lecUnits, p.labUnits);
  }
  const fromUnits = weeklyContactHoursFromUnits(args.lecUnits, args.labUnits);
  if (fromUnits > 0) return fromUnits;
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

export function plottedHoursBySubjectCode(args: {
  meetings: SubjectHourMeeting[];
  sectionId: string;
}): Map<string, number> {
  const map = new Map<string, number>();
  const sectionId = args.sectionId.trim();
  if (!sectionId) return map;
  for (const m of args.meetings) {
    if (m.sectionId !== sectionId) continue;
    const code = m.subjectCode.trim().toUpperCase();
    if (!code) continue;
    map.set(code, (map.get(code) ?? 0) + Math.max(0, m.hours));
  }
  return map;
}

export function subjectWeeklyHoursCaption(args: {
  requiredHours: number;
  alreadyPlottedHours: number;
  additionalHours: number;
}): { overLimit: boolean; text: string } {
  const total = args.alreadyPlottedHours + args.additionalHours;
  if (args.requiredHours <= 0) {
    return {
      overLimit: false,
      text: `This plot: ${args.additionalHours} hour(s).`,
    };
  }
  if (hoursExceedSubjectRequirement(args)) {
    return {
      overLimit: true,
      text: `Over limit: ${total} hour(s) plotted vs ${args.requiredHours} hour(s) required this term (lecture 1 unit = 1 hour, lab 1 unit = 3 hours). Reduce duration or remove extra meetings.`,
    };
  }
  const remaining = Math.max(0, args.requiredHours - total);
  return {
    overLimit: false,
    text:
      remaining > 0
        ? `Weekly contact: ${total} of ${args.requiredHours} hour(s) required · ${remaining} remaining.`
        : `Weekly contact: ${total} of ${args.requiredHours} hour(s) required · complete.`,
  };
}

export function subjectHoursOverLimitMessage(args: {
  subjectCode: string;
  requiredHours: number;
  alreadyPlottedHours: number;
  additionalHours: number;
}): string {
  const total = args.alreadyPlottedHours + args.additionalHours;
  return `${args.subjectCode} is over the prospectus limit: ${total} hour(s) plotted this term, but the subject only needs ${args.requiredHours} hour(s) per week (lecture 1 unit = 1 hour, lab 1 unit = 3 hours). Reduce duration or remove extra meetings before saving.`;
}
