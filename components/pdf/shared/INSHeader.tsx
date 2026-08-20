import { View, Text } from "@react-pdf/renderer";
import { ins } from "../styles/insStyles";

type INSHeaderProps = {
  formCode: string;
  formTitle: string;
  semesterLabel: string;
  universityName?: string;
  formDate?: string;
  revision?: string;
};

export function INSHeader({
  formCode,
  formTitle,
  semesterLabel,
  universityName = "Cebu Technological University",
 formDate = new Date(Date.now()).toLocaleDateString("en-US", {
  year: "numeric",
  month: "long",
  day: "numeric",
}),
  revision = "2",
}: INSHeaderProps) {
  return (
    <View>
      <View style={ins.headerRow}>
        <Text style={ins.universityName}>{universityName}</Text>
        <View style={ins.headerRight}>
          <Text style={ins.headerRightBold}>{formCode}</Text>
          <Text>{formDate}</Text>
          <Text>Revision: {revision}</Text>
        </View>
      </View>
      <View style={ins.navyRule} />
      <View style={ins.formTitleCenter}>
        <Text style={ins.formTitle}>{formTitle}</Text>
        <Text style={ins.formSubtitle}>Day Program</Text>
        <Text style={ins.semesterLine}>{semesterLabel}</Text>
      </View>
    </View>
  );
}
