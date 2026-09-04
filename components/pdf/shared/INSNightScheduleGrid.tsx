import { View, Text } from "@react-pdf/renderer";
import { StyleSheet } from "@react-pdf/renderer";
import { ins } from "../styles/insStyles";
import type { PDFScheduleGrid, PDFScheduleCell, PDFSignatureSlot } from "../types/insTypes";
import type { ReactNode } from "react";
import {
  NIGHT_INS_WEEKDAY_SLOT_LABELS,
  NIGHT_INS_WEEKEND_SLOT_LABELS,
} from "@/lib/scheduling/program-mode";
import { SignatureRail } from "./INSScheduleGrid";

const WEEKEND_DAYS = ["Saturday", "Sunday"] as const;
const WEEKDAY_DAYS = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"] as const;

type Props = {
  schedule: PDFScheduleGrid;
  summary?: ReactNode;
  /** Same right-side rotated rail as Day Program Faculty/Section PDFs. */
  rightSignatureSlots?: PDFSignatureSlot[];
};

const ROW_H = 16;
const HEADER_H = 14;
const NIGHT_RAIL_H = HEADER_H + NIGHT_INS_WEEKEND_SLOT_LABELS.length * ROW_H;

const ns = StyleSheet.create({
  wrap: {
    flexDirection: "row",
    alignItems: "stretch",
    borderWidth: 0.5,
    marginTop: 4,
    marginBottom: 4,
  },
  wrapFlush: {
    flexDirection: "row",
    alignItems: "stretch",
    borderWidth: 0.5,
  },
  outerWrapper: {
    flexDirection: "row",
    alignItems: "stretch",
    marginTop: 4,
    marginBottom: 4,
  },
  gridPart: {
    flex: 0.9,
  },
  weekend: {
    width: "34%",
  },
  weekdayCol: {
    flex: 1,
  },
  row: {
    flexDirection: "row",
    height: ROW_H,
    borderBottomWidth: 0.5,
  },
  headerRow: {
    flexDirection: "row",
    height: 14,
    borderBottomWidth: 0.5,
  },
  timeCell: {
    width: 40,
    padding: 1,
    fontSize: 5,
    fontFamily: "Helvetica-Bold",
    textAlign: "center",
    justifyContent: "center",
    borderRightWidth: 0.5,
  },
  dayHeader: {
    flex: 1,
    padding: 1,
    fontSize: 5.5,
    fontFamily: "Helvetica-Bold",
    textAlign: "center",
    justifyContent: "center",
    borderRightWidth: 0.5,
  },
  cell: {
    flex: 1,
    padding: 1,
    fontSize: 5,
    justifyContent: "center",
    borderRightWidth: 0.5,
    overflow: "hidden",
  },
  summaryBox: {
    flex: 1,
    padding: 3,
    overflow: "hidden",
    borderTopWidth: 0.5,
  },
});

function CellContent({ cell }: { cell: PDFScheduleCell | null }) {
  if (!cell) return null;
  return (
    <View style={ins.cellGroup}>
      {cell.line1 ? <Text style={ins.cellLine1}>{cell.line1}</Text> : null}
      {cell.line2 ? <Text style={ins.cellLine2}>{cell.line2}</Text> : null}
      {cell.line3 ? <Text style={ins.cellLine3}>{cell.line3}</Text> : null}
      {cell.line4 ? <Text style={ins.cellLine4}>{cell.line4}</Text> : null}
    </View>
  );
}

/**
 * Official Night Program L-grid: Sat/Sun 7:00 AM–10:00 PM beside Mon–Fri 4:00 PM–10:00 PM.
 * Weekday 4:00–5:00 aligns with weekend 7:00–8:00 (paper form).
 */
export function INSNightScheduleGrid({ schedule, summary, rightSignatureSlots }: Props) {
  const withRail = Boolean(rightSignatureSlots && rightSignatureSlots.length > 0);
  const grid = (
    <View style={withRail ? ns.wrapFlush : ns.wrap}>
      <View style={ns.weekend}>
        <View style={ns.headerRow} wrap={false}>
          <View style={ns.timeCell}>
            <Text>TIME</Text>
          </View>
          {WEEKEND_DAYS.map((day) => (
            <View key={day} style={ns.dayHeader}>
              <Text>{day}</Text>
            </View>
          ))}
        </View>
        {NIGHT_INS_WEEKEND_SLOT_LABELS.map((wLabel, wIdx) => (
          <View key={`w-${wIdx}`} style={ns.row} wrap={false}>
            <View style={ns.timeCell}>
              <Text>{wLabel}</Text>
            </View>
            {WEEKEND_DAYS.map((day) => (
              <View key={day} style={ns.cell}>
                <CellContent cell={(schedule[day] ?? [])[wIdx] ?? null} />
              </View>
            ))}
          </View>
        ))}
      </View>

      <View style={ns.weekdayCol}>
        <View style={ns.headerRow} wrap={false}>
          <View style={ns.timeCell}>
            <Text>TIME</Text>
          </View>
          {WEEKDAY_DAYS.map((day) => (
            <View key={day} style={ns.dayHeader}>
              <Text>{day}</Text>
            </View>
          ))}
        </View>
        {NIGHT_INS_WEEKDAY_SLOT_LABELS.map((label, idx) => (
          <View key={`d-${idx}`} style={ns.row} wrap={false}>
            <View style={ns.timeCell}>
              <Text>{label}</Text>
            </View>
            {WEEKDAY_DAYS.map((day) => (
              <View key={day} style={ns.cell}>
                <CellContent cell={(schedule[day] ?? [])[idx] ?? null} />
              </View>
            ))}
          </View>
        ))}
        <View style={ns.summaryBox}>
          {summary ?? null}
        </View>
      </View>
    </View>
  );

  if (!withRail || !rightSignatureSlots) {
    return grid;
  }

  return (
    <View style={ns.outerWrapper}>
      <View style={ns.gridPart}>{grid}</View>
      <SignatureRail slots={rightSignatureSlots} railHeight={NIGHT_RAIL_H} />
    </View>
  );
}
