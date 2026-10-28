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
  /**
   * Enrolled in this subject for this section — see `lib/scheduling/offering-enrollment`.
   *
   * Null when nobody has recorded it, which prints as a blank. A `0` would read as "no students
   * enrolled", which is a different and wrong statement.
   */
  students: number | null;
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
  /**
   * Where inside this hour a class ends, when it ends partway through.
   *
   * A 3:00–4:30 class covers the whole 3:00 row and only the first half of the 4:00 row. The grid
   * rules off the rest so the printed form says 4:30 rather than reading as 5:00.
   */
  partialFill?: number;
  /**
   * Where inside this hour a class begins, when it begins partway through.
   *
   * An 8:30 class in the 8:00 row is otherwise indistinguishable from an 8:00 one.
   */
  startFill?: number;
  /**
   * True when a class crosses this row's bottom edge.
   *
   * The rule under the row is then dropped, so the class reads as one box across the hour rather
   * than as two stacked cells.
   */
  openBottom?: boolean;
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
  headerBanner?: string | null;
  insFooterText?: string;
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
  headerBanner?: string | null;
  insFooterText?: string;
};

export type INS5CProps = {
  roomAssignment: string;
  semesterLabel: string;
  schedule: PDFScheduleGrid;
  signatureSlots?: PDFSignatureSlot[];
  programMode?: "day" | "night";
  headerBanner?: string | null;
  insFooterText?: string;
};
