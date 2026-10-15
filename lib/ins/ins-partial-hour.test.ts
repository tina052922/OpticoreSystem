import { describe, expect, it } from "vitest";
import { insBlockFillFraction, insPickSlotRender } from "./ins-weekly-grid-span";
import { slotsForSession } from "@/lib/scheduling/program-session";

const daySlots = slotsForSession("day");

/** Index of the 3:00 PM row on the Day grid, so the tests read as the form does. */
const THREE_PM = daySlots.findIndex((s) => s.startTime.startsWith("15"));

describe("insBlockFillFraction", () => {
  /** 3:00–4:30 inside a 3:00–5:00 block: three quarters. */
  it("measures a class that stops midway through its last row", () => {
    expect(insBlockFillFraction(16 * 60 + 30, 15 * 60, 17 * 60)).toBe(0.75);
  });

  it("is null when the class fills the block", () => {
    expect(insBlockFillFraction(17 * 60, 15 * 60, 17 * 60)).toBeNull();
  });

  it("is null when the class somehow overruns the block", () => {
    expect(insBlockFillFraction(18 * 60, 15 * 60, 17 * 60)).toBeNull();
  });

  it("is null for a block with no height", () => {
    expect(insBlockFillFraction(16 * 60, 15 * 60, 15 * 60)).toBeNull();
  });
});

describe("insPickSlotRender", () => {
  const cells = [{ time: "3:00-4:30", startTime: "15:00", endTime: "16:30" }];

  /**
   * The case this exists for: the cell has to span both the 3:00 and 4:00 rows, so the only thing
   * separating it from a 3:00–5:00 class is the fraction.
   */
  it("reports the three quarters a 3:00–4:30 class fills", () => {
    const pick = insPickSlotRender("Monday", THREE_PM, cells, {}, daySlots);
    expect(pick.kind).toBe("fill");
    if (pick.kind !== "fill") return;
    expect(pick.rowSpan).toBe(2);
    expect(pick.fillFraction).toBe(0.75);
  });

  it("reports no fraction for a class that ends on the hour", () => {
    const pick = insPickSlotRender(
      "Monday",
      THREE_PM,
      [{ time: "3:00-5:00", startTime: "15:00", endTime: "17:00" }],
      {},
      daySlots,
    );
    expect(pick.kind).toBe("fill");
    if (pick.kind !== "fill") return;
    expect(pick.rowSpan).toBe(2);
    expect(pick.fillFraction).toBeNull();
  });

  /** A single half-hour class fills half of its one row. */
  it("reports a half for a 3:00–3:30 class", () => {
    const pick = insPickSlotRender(
      "Monday",
      THREE_PM,
      [{ time: "3:00-3:30", startTime: "15:00", endTime: "15:30" }],
      {},
      daySlots,
    );
    expect(pick.kind).toBe("fill");
    if (pick.kind !== "fill") return;
    expect(pick.rowSpan).toBe(1);
    expect(pick.fillFraction).toBe(0.5);
  });

  /** The rule marks the block's extent, so it follows the longest class sharing the cell. */
  it("measures against the longest class when two share a start", () => {
    const pick = insPickSlotRender(
      "Monday",
      THREE_PM,
      [
        { time: "3:00-3:30", startTime: "15:00", endTime: "15:30" },
        { time: "3:00-4:30", startTime: "15:00", endTime: "16:30" },
      ],
      {},
      daySlots,
    );
    expect(pick.kind).toBe("fill");
    if (pick.kind !== "fill") return;
    expect(pick.fillFraction).toBe(0.75);
  });

  it("still skips the row a long class runs through", () => {
    expect(insPickSlotRender("Monday", THREE_PM + 1, cells, {}, daySlots).kind).toBe("skip");
  });
});

/**
 * Two classes can share an hour row: 7:00–8:30 reaches into the 8:00 row and 8:30–10:00 starts in
 * it. The row belongs to whichever class starts there, or that class is never drawn at all.
 */
describe("two classes sharing an hour", () => {
  const SEVEN_AM = daySlots.findIndex((s) => s.startTime.startsWith("07"));
  const pair = [
    { time: "7:00-8:30", startTime: "07:00", endTime: "08:30" },
    { time: "8:30-10:00", startTime: "08:30", endTime: "10:00" },
  ];

  it("still draws the first class", () => {
    const pick = insPickSlotRender("Monday", SEVEN_AM, pair, {}, daySlots);
    expect(pick.kind).toBe("fill");
    if (pick.kind !== "fill") return;
    expect(pick.items).toHaveLength(1);
    expect(pick.items[0]?.startTime).toBe("07:00");
    /* Cut short at the 8:00 row, which the second class now owns. */
    expect(pick.rowSpan).toBe(1);
  });

  /** The regression: this row used to come back "skip", so the second meeting vanished. */
  it("draws the second class in the row it starts in", () => {
    const pick = insPickSlotRender("Monday", SEVEN_AM + 1, pair, {}, daySlots);
    expect(pick.kind).toBe("fill");
    if (pick.kind !== "fill") return;
    expect(pick.items[0]?.startTime).toBe("08:30");
  });

  /** It begins at half past, so the top half of the 8:00 row is not its own. */
  it("marks where the second class begins", () => {
    const pick = insPickSlotRender("Monday", SEVEN_AM + 1, pair, {}, daySlots);
    if (pick.kind !== "fill") return;
    expect(pick.rowSpan).toBe(2);
    expect(pick.startFraction).toBe(0.25);
  });

  it("leaves a class that starts on the hour unmarked at the top", () => {
    const pick = insPickSlotRender(
      "Monday",
      SEVEN_AM,
      [{ time: "7:00-8:30", startTime: "07:00", endTime: "08:30" }],
      {},
      daySlots,
    );
    if (pick.kind !== "fill") return;
    expect(pick.startFraction).toBeNull();
  });
});

/**
 * A class cut short by the next one must not be ruled off at the hour.
 *
 * 7:00–8:30 gives up the 8:00 row to the 8:30 class, but it still runs to 8:30 — drawing the hour
 * line under it would slice the class in half at 8:00.
 */
describe("a class that runs past the rows it was given", () => {
  const SEVEN_AM = daySlots.findIndex((s) => s.startTime.startsWith("07"));

  it("reports that it continues below", () => {
    const pick = insPickSlotRender(
      "Monday",
      SEVEN_AM,
      [
        { time: "7:00-8:30", startTime: "07:00", endTime: "08:30" },
        { time: "8:30-10:00", startTime: "08:30", endTime: "10:00" },
      ],
      {},
      daySlots,
    );
    expect(pick.kind).toBe("fill");
    if (pick.kind !== "fill") return;
    expect(pick.rowSpan).toBe(1);
    expect(pick.continuesBelow).toBe(true);
    /* The rule belongs to the next cell, at 8:30 — not to this one. */
    expect(pick.fillFraction).toBeNull();
  });

  it("does not claim to continue when it ends inside its own rows", () => {
    const pick = insPickSlotRender(
      "Monday",
      SEVEN_AM,
      [{ time: "7:00-8:30", startTime: "07:00", endTime: "08:30" }],
      {},
      daySlots,
    );
    if (pick.kind !== "fill") return;
    expect(pick.rowSpan).toBe(2);
    expect(pick.continuesBelow).toBe(false);
    expect(pick.fillFraction).toBe(0.75);
  });

  it("does not claim to continue for a class ending on the hour", () => {
    const pick = insPickSlotRender(
      "Monday",
      SEVEN_AM,
      [{ time: "7:00-8:00", startTime: "07:00", endTime: "08:00" }],
      {},
      daySlots,
    );
    if (pick.kind !== "fill") return;
    expect(pick.continuesBelow).toBe(false);
  });
});

/**
 * Joining the two halves of a class that crosses an hour.
 *
 * Every cell draws its own border, so the 7:00 cell dropping its bottom rule is only half the job —
 * the 8:00 cell would still draw its own top edge on exactly that line.
 */
describe("the hour line between a class and its continuation", () => {
  const SEVEN_AM = daySlots.findIndex((s) => s.startTime.startsWith("07"));
  const pair = [
    { time: "7:00-8:30", startTime: "07:00", endTime: "08:30" },
    { time: "8:30-10:00", startTime: "08:30", endTime: "10:00" },
  ];

  it("opens the bottom of the cell the class runs out of", () => {
    const pick = insPickSlotRender("Monday", SEVEN_AM, pair, {}, daySlots);
    if (pick.kind !== "fill") return;
    expect(pick.continuesBelow).toBe(true);
    expect(pick.continuesAbove).toBe(false);
  });

  it("opens the top of the cell it runs into", () => {
    const pick = insPickSlotRender("Monday", SEVEN_AM + 1, pair, {}, daySlots);
    if (pick.kind !== "fill") return;
    expect(pick.continuesAbove).toBe(true);
  });

  /** A lone 8:30 class has genuinely free time above it, so that edge stays drawn. */
  it("keeps the top edge when nothing is running into the row", () => {
    const pick = insPickSlotRender(
      "Monday",
      SEVEN_AM + 1,
      [{ time: "8:30-10:00", startTime: "08:30", endTime: "10:00" }],
      {},
      daySlots,
    );
    if (pick.kind !== "fill") return;
    expect(pick.continuesAbove).toBe(false);
    expect(pick.startFraction).toBe(0.25);
  });
});
