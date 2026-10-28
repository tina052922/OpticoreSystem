import { View, Text } from "@react-pdf/renderer";
import { ins } from "../styles/insStyles";
import { type PDFCourseRow } from "../types/insTypes";

type INSSummaryTableProps = {
  courses: PDFCourseRow[];
  /**
   * Form 5A leads with the class size, because the form is read per faculty and the first question
   * is how many students each course carries.
   */
  studentsFirst?: boolean;
  /**
   * Form 5B is one section's own form, so every row would repeat the same section — the column
   * says nothing there.
   */
  showSection?: boolean;
};

/**
 * Column widths shared by header and body rows so they stay aligned.
 *
 * Also exported for the on-screen mirror in `OpticoreInsDocuments`, which prints the same table and
 * has to use the same ratios.
 */
export const INS_SUMMARY_COL_CODE = 0.8;
export const INS_SUMMARY_COL_TITLE = 2;
export const INS_SUMMARY_COL_SECTION = 1;
export const INS_SUMMARY_COL_STUDENTS = 0.6;

type ColumnKey = "students" | "code" | "title" | "section";

type Column = {
  key: ColumnKey;
  label: string;
  flex: number;
  /** Counts read right-aligned so the digits line up down the column. */
  right?: boolean;
};

const COLUMNS: Record<ColumnKey, Column> = {
  students: { key: "students", label: "No. of Students", flex: INS_SUMMARY_COL_STUDENTS, right: true },
  code: { key: "code", label: "Course Code", flex: INS_SUMMARY_COL_CODE },
  title: { key: "title", label: "Descriptive Title", flex: INS_SUMMARY_COL_TITLE },
  section: { key: "section", label: "Degree / Yr & Sec", flex: INS_SUMMARY_COL_SECTION },
};

/** The columns this form shows, in the order it shows them. */
export function insSummaryColumns(studentsFirst: boolean, showSection: boolean): Column[] {
  const rest: Column[] = [COLUMNS.code, COLUMNS.title, ...(showSection ? [COLUMNS.section] : [])];
  return studentsFirst ? [COLUMNS.students, ...rest] : [...rest, COLUMNS.students];
}

function cellValue(column: Column, course: PDFCourseRow): string {
  // A blank, not "0": nobody has counted this class yet, so leave room to write it in.
  if (column.key === "students") return course.students == null ? "" : String(course.students);
  if (column.key === "code") return course.code;
  if (column.key === "title") return course.title;
  return course.degreeYrSec;
}

/**
 * Summary of Courses — the subjects on this form, one row each.
 *
 * The student count is per course: the enrolment entered when the subject was plotted, which is
 * per subject-within-section rather than per section. Irregular students are why — one block can
 * bring 40 to its major and 12 to an elective, and a section-wide number cannot say that. A row
 * plotted before that figure existed falls back to the section's size (`insCourseEnrollment`).
 *
 * It used to appear only as a single total beside the title, which answered "how many students
 * altogether" rather than "how many sit in this class" — the question the form is read for.
 */
export function INSSummaryTable({
  courses,
  studentsFirst = false,
  showSection = true,
}: INSSummaryTableProps) {
  const columns = insSummaryColumns(studentsFirst, showSection);

  return (
    <View style={ins.summaryContainer}>
      <Text style={ins.summaryTitle}>Summary of Courses</Text>

      <View style={ins.summaryHeaderRow}>
        {columns.map((col) => (
          <Text
            key={col.key}
            style={[
              ins.summaryHeaderCell,
              { flex: col.flex },
              ...(col.right ? [{ textAlign: "right" as const }] : []),
            ]}
          >
            {col.label}
          </Text>
        ))}
      </View>

      {courses.length === 0 ? (
        <View style={ins.summaryRow}>
          {columns.map((col) => (
            <Text key={col.key} style={[ins.summaryCell, { flex: col.flex }]}>
              {col.key === "title" ? "No courses scheduled" : ""}
            </Text>
          ))}
        </View>
      ) : (
        courses.map((c, idx) => (
          <View key={`${c.code}-${idx}`} style={ins.summaryRow}>
            {columns.map((col) => (
              <Text
                key={col.key}
                style={[
                  ins.summaryCell,
                  { flex: col.flex },
                  ...(col.right ? [{ textAlign: "right" as const }] : []),
                ]}
              >
                {cellValue(col, c)}
              </Text>
            ))}
          </View>
        ))
      )}
    </View>
  );
}
