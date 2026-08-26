import { View, Text, Image } from "@react-pdf/renderer";
import { StyleSheet } from "@react-pdf/renderer";
import { ins } from "../styles/insStyles";
import type { PDFScheduleGrid, PDFScheduleCell, PDFSignatureSlot } from "../types/insTypes";
import { insTimeSlotLabels } from "@/lib/scheduling/program-session";
import { INS_DAYS } from "../types/insTypes";

/* eslint-disable jsx-a11y/alt-text */

type INSScheduleGridProps = {
  schedule: PDFScheduleGrid;
  rightSignatureSlots?: PDFSignatureSlot[];
  /** Kept for callers; Day Program INS always prints Mon–Sun 7:00 AM–5:00 PM. */
  programSession?: "day" | "night";
};

const RAIL_W = 100;
const GRID_H = 350;

const gs = StyleSheet.create({
  outerWrapper: {
    flexDirection: "row",
    alignItems: "stretch",
    marginTop: 4,
    marginBottom: 4,
  },
  gridPart: {
    flex: .9,
  },
  rail: {
    width: RAIL_W,
    height: GRID_H,
    marginLeft: 30,
    position: "relative",
  },
  rotatedStrip: {
    position: "absolute",
    top: GRID_H / 2 - RAIL_W / 2,
    left: -(GRID_H / 2 - 50 / 2),
    width: GRID_H,
    height: RAIL_W,
    transform: "rotate(-90deg)",
    flexDirection: "row",
    alignItems: "stretch",
  },
  sigBlock: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 6,
    paddingTop: 10
  },
  sigBlockLast: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 6,
    paddingTop: 10
  },
  sigTitle: {
    fontSize: 5.5,
    fontFamily: "Helvetica-Bold",
    textAlign: "center",
    marginBottom: 10,
  },
  space: {
    marginTop: 70,
  },
  sigLineView: {
    marginBottom: 1.5,
    marginTop: 3,
    height: .6,
    width: 80,
    backgroundColor: "black",
  },
  sigName: {
    fontSize: 5,
    textAlign: "center",
    marginBottom: 1,
    fontFamily: "Helvetica-Bold",
  },
  sigRole: {
    fontSize: 5,
    textAlign: "center",
  },
  sigImage: {
    height: 14,
    objectFit: "contain" as const,
    marginBottom: 3,
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

function GridTable({ schedule }: { schedule: PDFScheduleGrid }) {
  const days = INS_DAYS;
  const timeSlots = insTimeSlotLabels("day");
  return (
    <View style={ins.gridContainer}>
      <View style={ins.gridHeaderRow} wrap={false}>
        <View style={ins.gridTimeHeader}>
          <Text>TIME</Text>
        </View>
        {days.map((day) => (
          <View key={day} style={ins.gridDayHeader}>
            <Text>{day.slice(0, 3)}</Text>
          </View>
        ))}
      </View>

      {timeSlots.map((slot, slotIdx) => (
        <View key={slot} style={ins.gridRow} wrap={false}>
          <View style={ins.gridTimeCell}>
            <Text>{slot}</Text>
          </View>
          {days.map((day, dayIdx) => {
            const cells = schedule[day] ?? [];
            const cell = cells[slotIdx] ?? null;
            const isAlt = dayIdx % 2 === 1;
            return (
              <View key={day} style={isAlt ? ins.gridCellAlt : ins.gridCell}>
                <CellContent cell={cell} />
              </View>
            );
          })}
        </View>
      ))}
    </View>
  );
}

function SignatureRail({ slots }: { slots: PDFSignatureSlot[] }) {
  return (
    <View style={gs.rail}>
      <View style={gs.rotatedStrip}>
        {slots.map((slot, idx) => (
          <View
            key={slot.key}
            style={idx < slots.length - 1 ? gs.sigBlock : gs.sigBlockLast}
          >
            <Text style={gs.sigTitle}>{slot.lineTitle}</Text>
            {slot.imageUrl ? (
              <Image src={slot.imageUrl} style={gs.sigImage} />
            ) : null}
            <View style={gs.space} />
            {slot.signerName && slot.signerName !== "—" ? (
              <Text style={gs.sigName}>{slot.signerName}</Text>
            ) : null}
            <View style={gs.sigLineView} />
            <Text style={gs.sigRole}>{slot.lineSubtitle}</Text>
          </View>
        ))}
      </View>
    </View>
  );
}

export function INSScheduleGrid({ schedule, rightSignatureSlots }: INSScheduleGridProps) {
  if (!rightSignatureSlots || rightSignatureSlots.length === 0) {
    return <GridTable schedule={schedule} />;
  }

  return (
    <View style={gs.outerWrapper}>
      <View style={gs.gridPart}>
        <GridTable schedule={schedule} />
      </View>
      <SignatureRail slots={rightSignatureSlots} />
    </View>
  );
}
