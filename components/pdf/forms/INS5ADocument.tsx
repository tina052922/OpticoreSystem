import { Document, Page, View, Text } from "@react-pdf/renderer";
import { ins } from "../styles/insStyles";
import type { INS5AProps } from "../types/insTypes";
import { INSHeader } from "../shared/INSHeader";
import { INSBrandedFooter } from "../shared/INSBrandedFooter";
import { INSScheduleGrid } from "../shared/INSScheduleGrid";
import { INSNightScheduleGrid } from "../shared/INSNightScheduleGrid";
import { INSSummaryTable } from "../shared/INSSummaryTable";
import { WordSafeText } from "../shared/WordSafeText";

function FieldRow({ label, value }: { label: string; value?: string | null }) {
  return (
    <View style={ins.fieldRow}>
      <Text style={ins.fieldLabel}>{label}:</Text>
      <Text style={ins.fieldValue}>{value?.trim() || "—"}</Text>
    </View>
  );
}

export function INS5ADocument({ data }: { data: INS5AProps }) {
  const {
    facultyName,
    semesterLabel,
    statusOfAppointment,
    credentials,
    schedule,
    courses,
    summary,
    signatureSlots,
    headerBanner,
    insFooterText,
  } = data;

  return (
    <Document>
      <Page size="A4" style={ins.page}>
        <INSHeader
          formCode="INS Form 5A"
          formTitle="Program by Teacher"
          semesterLabel={semesterLabel}
          programMode={data.programMode}
          headerBanner={headerBanner}
        />

        <View style={ins.fieldRow}>
          <Text style={ins.fieldLabel}>Name:</Text>
          <Text style={ins.fieldValue}>{facultyName}</Text>
        </View>

        <View style={ins.statusRow}>
          <Text style={ins.statusLabel}>Status of Appointment:</Text>
          <View style={ins.checkboxGroup}>
            <View
              style={
                statusOfAppointment === "Permanent"
                  ? ins.checkboxChecked
                  : ins.checkbox
              }
            />
            <Text style={ins.checkboxLabel}>Permanent</Text>
          </View>
          <View style={ins.checkboxGroup}>
            <View
              style={
                statusOfAppointment === "Temporary"
                  ? ins.checkboxChecked
                  : ins.checkbox
              }
            />
            <Text style={ins.checkboxLabel}>Temporary</Text>
          </View>
          <View style={ins.checkboxGroup}>
            <View
              style={
                statusOfAppointment === "Contract of Service"
                  ? ins.checkboxChecked
                  : ins.checkbox
              }
            />
            <Text style={ins.checkboxLabel}>Contract of Service</Text>
          </View>
        </View>

        <View style={ins.credentialsGrid}>
          {/* Col 1 degrees | Col 2 Major / Minor / Special Training (same widths). */}
          <View style={ins.columnContainerHeader}>
            <View style={ins.fieldRowDegree}>
              <Text style={ins.fieldLabel}>Bachelor&apos;s Degree:</Text>
              <Text style={ins.fieldValue}>
                {credentials?.bachelors || "—"}
              </Text>
            </View>
            <View style={ins.fieldRowMajor}>
              <Text style={ins.fieldLabel}>Major:</Text>
              <WordSafeText style={ins.fieldValueMajor}>
                {credentials?.major?.trim() || "—"}
              </WordSafeText>
            </View>
          </View>
          <View style={ins.columnContainerHeader}>
            <View style={ins.fieldRowDegree}>
              <Text style={ins.fieldLabel}>Master&apos;s Degree:</Text>
              <Text style={ins.fieldValue}>
                {credentials?.masters || "—"}
              </Text>
            </View>
            <View style={ins.fieldRowMajor}>
              <Text style={ins.fieldLabel}>Minor:</Text>
              <WordSafeText style={ins.fieldValueMajor}>
                {credentials?.minor?.trim() || "—"}
              </WordSafeText>
            </View>
          </View>
          <View style={ins.columnContainerHeader}>
            <View style={ins.fieldRowDegree}>
              <Text style={ins.fieldLabel}>Doctorate Degree:</Text>
              <Text style={ins.fieldValue}>
                {credentials?.doctorate || "—"}
              </Text>
            </View>
            <View style={ins.fieldRowMajor}>
              <Text style={ins.fieldLabel}>Special Training:</Text>
              <WordSafeText style={ins.fieldValueMajor}>
                {credentials?.specialTraining?.trim() || "—"}
              </WordSafeText>
            </View>
          </View>
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

        <View style={ins.metricsContainer}>
          <View style={ins.metricsGrid}>
            <View style={ins.metricsColumn}>
              <FieldRow
                label="No. of Preparations"
                value={
                  summary?.preparations != null
                    ? String(summary.preparations)
                    : null
                }
              />
              <FieldRow
                label="No. of Units"
                value={
                  summary?.totalUnits != null
                    ? String(summary.totalUnits)
                    : null
                }
              />
              <FieldRow
                label="No. of Hours/Week"
                value={
                  summary?.hoursPerWeek != null
                    ? String(summary.hoursPerWeek)
                    : null
                }
              />
            </View>
            <View style={ins.metricsColumn}>
              <FieldRow
                label="Administrative Designation"
                value={summary?.administrativeDesignation}
              />
              <FieldRow label="Production" value={summary?.production} />
              <FieldRow label="Extension" value={summary?.extension} />
              <FieldRow label="Research" value={summary?.research} />
            </View>
          </View>
        </View>

        <INSBrandedFooter text={insFooterText} />
      </Page>
    </Document>
  );
}
