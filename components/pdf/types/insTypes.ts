import {
  insTimeSlotLabels,
  NIGHT_PROGRAM_WEEKDAYS,
  type ProgramSessionWeekday,
} from "@/lib/scheduling/program-session";

export type InsDay = ProgramSessionWeekday;

export const INS_DAYS: InsDay[] = [...NIGHT_PROGRAM_WEEKDAYS];

export const INS_TIME_SLOTS = insTimeSlotLabels("night");

export type PDFSignatureSlot = {
  key: string;
  lineTitle: string;
  lineSubtitle: string;
  signerName: string;
  imageUrl: string | null;
};

export type PDFCourseRow = {
  students: number;
  code: string;
  title: string;
  degreeYrSec: string;
};

/**
 * Total students across the Summary of Courses rows.
 * Shared by the PDF and the on-screen Load Generator table so the two can never
 * print a different number.
 */
export function insTotalStudents(
  courses: ReadonlyArray<{ students?: number | null }>,
): number {
  return courses.reduce((acc, c) => acc + (c.students ?? 0), 0);
}

export type PDFScheduleCell = {
  line1: string;
  line2?: string;
  line3?: string;
  line4?: string;
};

export type PDFScheduleGrid = Record<InsDay, (PDFScheduleCell | null)[]>;

export type INS5AProps = {
  facultyName: string;
  semesterLabel: string;
  statusOfAppointment?: "Permanent" | "Temporary" | "Contract of Service" | null;
  credentials?: {
    bachelors?: string | null;
    masters?: string | null;
    doctorate?: string | null;
    major?: string | null;
    minor?: string | null;
    specialTraining?: string | null;
  } | null;
  schedule: PDFScheduleGrid;
  courses: PDFCourseRow[];
  summary?: {
    preparations?: number | null;
    totalUnits?: number | null;
    hoursPerWeek?: number | null;
    administrativeDesignation?: string | null;
    production?: string | null;
    extension?: string | null;
    research?: string | null;
  } | null;
  signatureSlots?: PDFSignatureSlot[];
  programSession?: "day" | "night";
};

export type INS5BProps = {
  degreeAndYear: string;
  major?: string;
  adviser: string;
  assignment: string;
  semesterLabel: string;
  schedule: PDFScheduleGrid;
  courses: PDFCourseRow[];
  signatureSlots?: PDFSignatureSlot[];
  programSession?: "day" | "night";
};

export type INS5CProps = {
  roomAssignment: string;
  semesterLabel: string;
  schedule: PDFScheduleGrid;
  signatureSlots?: PDFSignatureSlot[];
  programSession?: "day" | "night";
};
