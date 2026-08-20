import { View, Text } from "@react-pdf/renderer";
import { ins } from "../styles/insStyles";
import type { PDFCourseRow } from "../types/insTypes";

type INSSummaryTableProps = {
  courses: PDFCourseRow[];
  showDegreeYrSec?: boolean;
};

export function INSSummaryTable({
  courses,
}: INSSummaryTableProps) {
  return (
    <View style={ins.summaryContainer}>
      <View style={ins.summaryTitleRow}>
        
          <Text style={ins.summaryTitle}>No. of Students : 
              &nbsp;{courses.reduce((acc, c) => (c.students ?? 0), 0)}
          </Text>
          <Text style={ins.summaryTitle}>Summary of Courses</Text>
        </View>
      

      <View style={ins.summaryHeaderRow}>
        {/* <Text style={[ins.summaryHeaderCell, { flex: 0.8 }]}>
          No. of Students
        </Text> */}
        <Text style={[ins.summaryHeaderCell, { flex: 0.8 }]}>Course code</Text>
        <Text style={[ins.summaryHeaderCell, { flex: 1.6 }]}>
          Descriptive Title
        </Text>
     
      </View>

      {courses.length === 0 ? (
        <View style={ins.summaryRow}>
          {/* <Text style={[ins.summaryCell, { flex: 0.8 }]}>—</Text> */}
          <Text style={[ins.summaryCell, { flex: 0.8 }]}>—</Text>
          <Text style={[ins.summaryCell, { flex: 1.6 }]}>
            No courses scheduled
          </Text>
       
        </View>
      ) : (
        courses.map((c, idx) => (
          <View key={idx} style={ins.summaryRow}>
            {/* <Text style={[ins.summaryCell, { flex: 0.8 }]}>
              {c.students}
            </Text> */}
            <Text style={[ins.summaryCell, { flex: 0.8 }]}>{c.code}</Text>
            <Text style={[ins.summaryCell, { flex: 1.6 }]}>{c.title}</Text>
            
          </View>
        ))
      )}
    </View>
  );
}
