import { Document, Page, View, Text } from "@react-pdf/renderer";
import { ins } from "../styles/insStyles";
import type { INS5BProps } from "../types/insTypes";
import { INSHeader } from "../shared/INSHeader";
import { INSBrandedFooter } from "../shared/INSBrandedFooter";
import { INSScheduleGrid } from "../shared/INSScheduleGrid";
import { INSNightScheduleGrid } from "../shared/INSNightScheduleGrid";
import { INSSummaryTable } from "../shared/INSSummaryTable";

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

        <View style={ins.columnContainerHeader}>
          <View style={ins.fieldRow}>
            <Text style={ins.fieldLabel}>Degree and Year:</Text>
            <Text style={ins.fieldValue} wrap={false}>
              {degreeAndYear}
            </Text>
          </View>
          {data.programMode === "night" ? (
            <View style={ins.fieldRow}>
              <Text style={ins.fieldValue} wrap={false}>
                {assignment || "—"}
              </Text>
            </View>
          ) : null}
          <View style={ins.fieldRow}>
            <Text style={ins.fieldLabel}>Major:</Text>
            <Text style={ins.fieldValue} wrap={false}>
              {major || "—"}
            </Text>
          </View>
        </View>

        <View style={ins.fieldRow}>
          <Text style={ins.fieldLabel}>Adviser:</Text>
          <Text style={ins.fieldValue}>{adviser || "—"}</Text>
        </View>

        {data.programMode === "night" ? null : (
        <View style={ins.fieldRow}>
          <Text style={ins.fieldLabel}>Assignment:</Text>
          <Text style={ins.fieldValue}>{assignment || "—"}</Text>
        </View>
        )}

        {data.programMode === "night" ? (
          <INSNightScheduleGrid
            schedule={schedule}
            rightSignatureSlots={signatureSlots ?? [
              { key: "prepared", lineTitle: "Prepared by:", lineSubtitle: "Program Coordinator/Chair", signerName: "", imageUrl: null },
              { key: "reviewed", lineTitle: "Reviewed, Certified True and Correct:", lineSubtitle: "Director/Dean", signerName: "", imageUrl: null },
              { key: "approved", lineTitle: "Approved:", lineSubtitle: "Campus Director", signerName: "", imageUrl: null },
            ]}
          />
        ) : (
          <INSScheduleGrid
            schedule={schedule}
            rightSignatureSlots={signatureSlots ?? [
              { key: "prepared", lineTitle: "Prepared by:", lineSubtitle: "Program Coordinator/Chair", signerName: "", imageUrl: null },
              { key: "reviewed", lineTitle: "Reviewed, Certified True and Correct:", lineSubtitle: "Director/Dean", signerName: "", imageUrl: null },
              { key: "approved", lineTitle: "Approved:", lineSubtitle: "Campus Director", signerName: "", imageUrl: null },
            ]}
          />
        )}
        <INSSummaryTable courses={courses} />
        <INSBrandedFooter text={insFooterText} />
      </Page>
    </Document>
  );
}
