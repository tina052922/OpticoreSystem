import { View, Text } from "@react-pdf/renderer";
import { ins } from "../styles/insStyles";
import { insTotalStudents, type PDFCourseRow } from "../types/insTypes";

type INSSummaryTableProps = {
  courses: PDFCourseRow[];
};

/** Column widths shared by header and body rows so they stay aligned. */
export const INS_SUMMARY_COL_CODE = 0.8;
export const INS_SUMMARY_COL_TITLE = 1.6;

export function INSSummaryTable({ courses }: INSSummaryTableProps) {
  return (
    <View style={ins.summaryContainer}>
      <View style={ins.summaryTitleRow}>
        <Text style={ins.summaryTitle}>
          No. of Students : {insTotalStudents(courses)}
        </Text>
        <Text style={ins.summaryTitle}>Summary of Courses</Text>
      </View>

      <View style={ins.summaryHeaderRow}>
        <Text style={[ins.summaryHeaderCell, { flex: INS_SUMMARY_COL_CODE }]}>
          Course code
        </Text>
        <Text style={[ins.summaryHeaderCell, { flex: INS_SUMMARY_COL_TITLE }]}>
          Descriptive Title
        </Text>
      </View>

      {courses.length === 0 ? (
        <View style={ins.summaryRow}>
          <Text style={[ins.summaryCell, { flex: INS_SUMMARY_COL_CODE }]}>—</Text>
          <Text style={[ins.summaryCell, { flex: INS_SUMMARY_COL_TITLE }]}>
            No courses scheduled
          </Text>
        </View>
      ) : (
        courses.map((c, idx) => (
          <View key={`${c.code}-${idx}`} style={ins.summaryRow}>
            <Text style={[ins.summaryCell, { flex: INS_SUMMARY_COL_CODE }]}>
              {c.code}
            </Text>
            <Text style={[ins.summaryCell, { flex: INS_SUMMARY_COL_TITLE }]}>
              {c.title}
            </Text>
          </View>
        ))
      )}
    </View>
  );
}
