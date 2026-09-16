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

const RAIL_W = 112;
/** Match day grid body (header + time rows) so the signature rail does not stretch a gap under the schedule. */
const DAY_HEADER_H = 14;
const DAY_ROW_H = 28;
const DAY_SLOT_COUNT = insTimeSlotLabels("day").length;
const DAY_RAIL_H = DAY_HEADER_H + DAY_SLOT_COUNT * DAY_ROW_H;

const gs = StyleSheet.create({
  outerWrapper: {
    flexDirection: "row",
    alignItems: "flex-start",
    marginTop: 4,
    marginBottom: 4,
  },
  gridPart: {
    flex: 0.9,
  },
  /** Flush grid inside the rail wrapper — margins live on outerWrapper only. */
  gridContainerFlush: {
    borderWidth: 0.5,
    marginTop: 0,
    marginBottom: 0,
  },
  rail: {
    width: RAIL_W,
    height: DAY_RAIL_H,
    marginLeft: 24,
    position: "relative",
  },
  rotatedStrip: {
    position: "absolute",
    top: DAY_RAIL_H / 2 - RAIL_W / 2,
    left: -(DAY_RAIL_H / 2 - RAIL_W / 2),
    width: DAY_RAIL_H,
    height: RAIL_W,
    transform: "rotate(-90deg)",
    flexDirection: "row",
    alignItems: "stretch",
  },
  sigBlock: {
    flex: 1,
    height: "100%",
    alignItems: "center",
    justifyContent: "flex-start",
    paddingHorizontal: 4,
    paddingTop: 4,
    paddingBottom: 3,
  },
  sigTitle: {
    fontSize: 5.5,
    fontFamily: "Helvetica-Bold",
    textAlign: "center",
    marginBottom: 2,
    flexShrink: 0,
  },
  /** Flexible gap between title and footer — never a fixed 70pt that clips the sig line. */
  sigSpacer: {
    flexGrow: 1,
    flexShrink: 1,
    minHeight: 2,
  },
  sigFooter: {
    width: "100%",
    alignItems: "center",
    flexShrink: 0,
  },
  sigLineView: {
    marginTop: 2,
    marginBottom: 2,
    height: 0.85,
    width: "88%",
    maxWidth: 96,
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
    height: 22,
    maxWidth: "90%",
    objectFit: "contain" as const,
    marginBottom: 2,
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

function GridTable({
  schedule,
  flush = false,
}: {
  schedule: PDFScheduleGrid;
  flush?: boolean;
}) {
  const days = INS_DAYS;
  const timeSlots = insTimeSlotLabels("day");
  return (
    <View style={flush ? gs.gridContainerFlush : ins.gridContainer}>
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

export function SignatureRail({
  slots,
  railHeight = DAY_RAIL_H,
}: {
  slots: PDFSignatureSlot[];
  railHeight?: number;
}) {
  return (
    <View style={[gs.rail, { height: railHeight }]}>
      <View
        style={[
          gs.rotatedStrip,
          {
            top: railHeight / 2 - RAIL_W / 2,
            left: -(railHeight / 2 - RAIL_W / 2),
            width: railHeight,
            height: RAIL_W,
          },
        ]}
      >
        {slots.map((slot) => (
          <View key={slot.key} style={gs.sigBlock}>
            <Text style={gs.sigTitle}>{slot.lineTitle}</Text>
            <View style={gs.sigSpacer} />
            <View style={gs.sigFooter}>
              {slot.imageUrl ? (
                <Image src={slot.imageUrl} style={gs.sigImage} />
              ) : null}
              {slot.signerName && slot.signerName !== "—" ? (
                <Text style={gs.sigName}>{slot.signerName}</Text>
              ) : null}
              {/* Always draw the signature underline (Chair + Campus Director were clipping before). */}
              <View style={gs.sigLineView} />
              <Text style={gs.sigRole}>{slot.lineSubtitle}</Text>
            </View>
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
        <GridTable schedule={schedule} flush />
      </View>
      <SignatureRail slots={rightSignatureSlots} railHeight={DAY_RAIL_H} />
    </View>
  );
}
