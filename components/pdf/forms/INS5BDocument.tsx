import { Document, Page, View, Text } from "@react-pdf/renderer";
import { ins } from "../styles/insStyles";
import type { INS5BProps } from "../types/insTypes";
import { INSHeader } from "../shared/INSHeader";
import { INSBrandedFooter } from "../shared/INSBrandedFooter";
import { INSScheduleGrid } from "../shared/INSScheduleGrid";
import { INSNightScheduleGrid } from "../shared/INSNightScheduleGrid";
import { INSSummaryTable } from "../shared/INSSummaryTable";
import { WordSafeText } from "../shared/WordSafeText";

export function INS5BDocument({ data }: { data: INS5BProps }) {
  const {
    degreeAndYear,
    major,
    adviser,
    assignment,
    semesterLabel,
    schedule,
    courses,
    signatureSlots,
    headerBanner,
    insFooterText,
  } = data;

  return (
    <Document>
      <Page size="A4" style={ins.page}>
        <INSHeader
          formCode="INS Form 5B"
          formTitle="Program by Section"
          semesterLabel={semesterLabel}
          programMode={data.programMode}
          headerBanner={headerBanner}
        />

        {/* Official paper: Degree and Year (col 1) | Major (col 2). */}
        <View style={ins.columnContainerHeader}>
          <View style={ins.fieldRowDegree}>
            <Text style={ins.fieldLabel}>Degree and Year:</Text>
            <Text style={ins.fieldValue}>{degreeAndYear}</Text>
          </View>
          <View style={ins.fieldRowMajor}>
            <Text style={ins.fieldLabel}>Major:</Text>
            <WordSafeText style={ins.fieldValueMajor}>
              {major?.trim() || "—"}
            </WordSafeText>
          </View>
        </View>

        <View style={ins.fieldRow}>
          <Text style={ins.fieldLabel}>Adviser:</Text>
          <Text style={ins.fieldValue}>{adviser || "—"}</Text>
        </View>

        <View style={ins.fieldRow}>
          <Text style={ins.fieldLabel}>Assignment:</Text>
          <Text style={ins.fieldValue}>{assignment || "—"}</Text>
        </View>

        {data.programMode === "night" ? (
          <INSNightScheduleGrid
            schedule={schedule}
            rightSignatureSlots={signatureSlots ?? [
              { key: "prepared", lineTitle: "Prepared by:", lineSubtitle: "Program Coordinator/Chair", signerName: "Program Coordinator/Chair", imageUrl: null },
              { key: "reviewed", lineTitle: "Reviewed, Certified True and Correct:", lineSubtitle: "Director/Dean", signerName: "Director/Dean", imageUrl: null },
              { key: "approved", lineTitle: "Approved:", lineSubtitle: "Campus Director", signerName: "Campus Director", imageUrl: null },
            ]}
          />
        ) : (
          <INSScheduleGrid
            schedule={schedule}
            rightSignatureSlots={signatureSlots ?? [
              { key: "prepared", lineTitle: "Prepared by:", lineSubtitle: "Program Coordinator/Chair", signerName: "Program Coordinator/Chair", imageUrl: null },
              { key: "reviewed", lineTitle: "Reviewed, Certified True and Correct:", lineSubtitle: "Director/Dean", signerName: "Director/Dean", imageUrl: null },
              { key: "approved", lineTitle: "Approved:", lineSubtitle: "Campus Director", signerName: "Campus Director", imageUrl: null },
            ]}
          />
        )}
        <INSSummaryTable courses={courses} />
        <INSBrandedFooter text={insFooterText} />
      </Page>
    </Document>
  );
}
