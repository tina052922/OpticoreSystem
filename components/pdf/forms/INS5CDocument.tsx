import { Document, Page, View, Text } from "@react-pdf/renderer";
import { ins } from "../styles/insStyles";
import type { INS5CProps } from "../types/insTypes";
import { INSHeader } from "../shared/INSHeader";
import { INSScheduleGrid } from "../shared/INSScheduleGrid";
import { INSNightScheduleGrid } from "../shared/INSNightScheduleGrid";
import { INSSignatureBlock } from "../shared/INSSignatureBlock";

export function INS5CDocument({ data }: { data: INS5CProps }) {
  const { roomAssignment, semesterLabel, schedule, signatureSlots } = data;

  return (
    <Document>
      <Page size="A4" style={ins.page}>
        <INSHeader
          formCode="INS Form 5C"
          formTitle="Room Utilization"
          semesterLabel={semesterLabel}
          programMode={data.programMode}
        />

        <View style={ins.fieldRow}>
          <Text style={ins.fieldLabel}>Room Assignment:</Text>
          <Text style={ins.fieldValue}>{roomAssignment}</Text>
        </View>

        {data.programMode === "night" ? (
          <INSNightScheduleGrid schedule={schedule} />
        ) : (
          <INSScheduleGrid schedule={schedule} />
        )}

        <INSSignatureBlock slots={signatureSlots} layout="horizontal" />
      </Page>
    </Document>
  );
}
