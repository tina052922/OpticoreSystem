export type InsDay =
  | "Monday"
  | "Tuesday"
  | "Wednesday"
  | "Thursday"
  | "Friday"
  | "Saturday"
  | "Sunday";

export const INS_DAYS: InsDay[] = [
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
  "Sunday",
];

export const INS_TIME_SLOTS = [
  "7:00-8:00",
  "8:00-9:00",
  "9:00-10:00",
  "10:00-11:00",
  "11:00-12:00",
  "12:00-1:00",
  "1:00-2:00",
  "2:00-3:00",
  "3:00-4:00",
  "4:00-5:00",
  "5:00-6:00",
  "6:00-7:00",
] as const;

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
  programMode?: "day" | "night";
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
  programMode?: "day" | "night";
};

export type INS5CProps = {
  roomAssignment: string;
  semesterLabel: string;
  schedule: PDFScheduleGrid;
  signatureSlots?: PDFSignatureSlot[];
  programMode?: "day" | "night";
};
