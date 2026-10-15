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
  /** Lets the partial-hour rule sit against the cell rather than in the text flow. */
  cellBox: {
    position: "relative",
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
  /**
   * The part of an hour the class does not use: plain white, ruled off from the class by a solid
   * line, so it reads as free time and the next meeting's own box is what the eye picks out.
   */
  partialRemainder: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: "#FFFFFF",
    borderTopWidth: 0.5,
    borderTopColor: "#000000",
  },
  /** The same, for the part of the hour before a class that begins at half past. */
  partialLeader: {
    position: "absolute",
    left: 0,
    right: 0,
    top: 0,
    backgroundColor: "#FFFFFF",
    borderBottomWidth: 0.5,
    borderBottomColor: "#000000",
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

/**
 * Joins a cell to the hour below, and sits the text in the part of the hour its class occupies.
 *
 * The text already goes in the row its class occupies most of, so the common case needs nothing.
 * What is left is a class contained within one hour but not filling it — 8:00–8:30, or 8:30–9:00 —
 * where the row is shared and the text belongs in its own half.
 *
 * Expressed as an alignment rather than as padding, because padding competes with the text for the
 * same space: four lines nearly fill a 28pt row, and react-pdf clips what spills.
 */
export function continuedCellStyle(
  cell: { startFill?: number; partialFill?: number; openBottom?: boolean } | null | undefined,
): Array<{ borderBottomWidth?: number; justifyContent?: "flex-start" | "flex-end" | "center" }> {
  if (!cell) return [];
  const out: Array<{
    borderBottomWidth?: number;
    justifyContent?: "flex-start" | "flex-end" | "center";
  }> = [];

  // A class crossing this row's bottom edge is not ruled off on it.
  if (cell.openBottom) out.push({ borderBottomWidth: 0 });

  const startsLate = (cell.startFill ?? 0) > 0;
  const endsEarly = cell.partialFill != null && cell.partialFill < 1;
  if (startsLate && !endsEarly) out.push({ justifyContent: "flex-end" });
  else if (endsEarly && !startsLate) out.push({ justifyContent: "flex-start" });
  return out;
}

/**
 * Rules off the part of an hour a class does not use.
 *
 * A 3:00–4:30 class runs into the 4:00 row but stops in the middle of it. Without this line the
 * printed form reads as 3:00–5:00, since the grid has no finer row than the hour.
 *
 * The offset is in points against {@link DAY_ROW_H} rather than a percentage: react-pdf resolves a
 * percentage height against the parent's used height, and the grid rows are a `minHeight`, so a
 * percentage would drift on any row a long course title has grown.
 */
export function PartialHourRule({
  fraction,
  startFraction,
  rowHeight = DAY_ROW_H,
}: {
  fraction: number | undefined;
  startFraction?: number | undefined;
  rowHeight?: number;
}) {
  const hasEnd = fraction != null && fraction > 0 && fraction < 1;
  const hasStart = startFraction != null && startFraction > 0 && startFraction < 1;
  if (!hasEnd && !hasStart) return null;
  /*
   * Each marker is measured from the edge it hangs off, not from the opposite one: the day rows are
   * a `minHeight`, so a row holding a long course title is taller than `rowHeight`. Anchored to its
   * own edge, a marker is then merely a little short rather than floating in the wrong hour.
   */
  return (
    <>
      {hasStart ? <View style={[gs.partialLeader, { height: startFraction * rowHeight }]} /> : null}
      {hasEnd ? <View style={[gs.partialRemainder, { height: (1 - fraction) * rowHeight }]} /> : null}
    </>
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
              <View
                key={day}
                style={[
                  isAlt ? ins.gridCellAlt : ins.gridCell,
                  gs.cellBox,
                  ...continuedCellStyle(cell),
                ]}
              >
                {/* Rules first: react-pdf paints in order, and these are opaque white. */}
                <PartialHourRule fraction={cell?.partialFill} startFraction={cell?.startFill} />
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
