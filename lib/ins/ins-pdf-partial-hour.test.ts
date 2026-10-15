import { describe, expect, it } from "vitest";
import { roomScheduleToPdfGrid } from "./ins-pdf-adapters";
import { INS_TIME_SLOTS, type InsDay } from "@/components/ins/ins-layout/opticore-ins-constants";
import type { InsRoomCell } from "./build-ins-room-view";

const EMPTY = {
  Monday: [], Tuesday: [], Wednesday: [], Thursday: [],
  Friday: [], Saturday: [], Sunday: [],
} as Record<InsDay, InsRoomCell[]>;

function cell(startTime: string, endTime: string): InsRoomCell {
  return {
    time: `${startTime}-${endTime}`,
    startTime,
    endTime,
    course: "GEE-TEM",
    instructor: "Vexze Semilla",
    yearSec: "BSIT 1A",
    room: "ST 204",
  };
}

/** Row indices on the printed Day grid, so the tests read as the form does. */
const THREE_PM = INS_TIME_SLOTS.findIndex((s) => s.startsWith("3:00"));
const FOUR_PM = THREE_PM + 1;

describe("roomScheduleToPdfGrid", () => {
  /**
   * A class writes its text into the hour it occupies most of, and marks the hours its edges fall
   * inside. 3:00–4:30 owns the whole 3:00 row and half the 4:00 one.
   */
  it("marks the 4:00 row half filled for a 3:00–4:30 class", () => {
    const grid = roomScheduleToPdfGrid({ ...EMPTY, Monday: [cell("15:00", "16:30")] });
    expect(grid.Monday[THREE_PM]?.line1).toBe("GEE-TEM");
    expect(grid.Monday[THREE_PM]?.partialFill).toBeUndefined();
    expect(grid.Monday[THREE_PM]?.openBottom).toBe(true);
    expect(grid.Monday[FOUR_PM]?.line1).toBe("");
    expect(grid.Monday[FOUR_PM]?.partialFill).toBe(0.5);
  });

  it("leaves a 3:00–5:00 class with no half marker, but still joins the rows", () => {
    const grid = roomScheduleToPdfGrid({ ...EMPTY, Monday: [cell("15:00", "17:00")] });
    expect(grid.Monday[THREE_PM]?.line1).toBe("GEE-TEM");
    expect(grid.Monday[THREE_PM]?.partialFill).toBeUndefined();
    expect(grid.Monday[THREE_PM]?.openBottom).toBe(true);
    expect(grid.Monday[FOUR_PM]?.partialFill).toBeUndefined();
    expect(grid.Monday[FOUR_PM]?.openBottom).toBeUndefined();
  });

  /** A class contained in one row carries the marker on its own cell, under its text. */
  it("marks the starting row for a 3:00–3:30 class", () => {
    const grid = roomScheduleToPdfGrid({ ...EMPTY, Monday: [cell("15:00", "15:30")] });
    expect(grid.Monday[THREE_PM]?.line1).toBe("GEE-TEM");
    expect(grid.Monday[THREE_PM]?.partialFill).toBe(0.5);
    expect(grid.Monday[THREE_PM]?.openBottom).toBeUndefined();
    expect(grid.Monday[FOUR_PM]).toBeNull();
  });

  it("leaves hours with nothing in them null", () => {
    const grid = roomScheduleToPdfGrid({ ...EMPTY, Monday: [cell("15:00", "16:30")] });
    expect(grid.Monday[THREE_PM - 1]).toBeNull();
    expect(grid.Monday[FOUR_PM + 1]).toBeNull();
  });
});

/**
 * The text goes in the hour the class occupies most of, not the hour it starts in.
 *
 * An 8:30–10:00 class starts in the 8:00 row but owns only its bottom half, and half a row cannot
 * hold four lines — the text used to spill up across the 8:30 rule and over the class above it.
 */
describe("which row a class writes its text into", () => {
  const EIGHT_AM = INS_TIME_SLOTS.findIndex((s) => s.startsWith("8:00"));
  const NINE_AM = EIGHT_AM + 1;

  it("writes an 8:30–10:00 class into the 9:00 row, which is wholly its own", () => {
    const grid = roomScheduleToPdfGrid({ ...EMPTY, Monday: [cell("08:30", "10:00")] });
    expect(grid.Monday[EIGHT_AM]?.line1).toBe("");
    expect(grid.Monday[EIGHT_AM]?.startFill).toBe(0.5);
    expect(grid.Monday[NINE_AM]?.line1).toBe("GEE-TEM");
  });

  /** The pair from the form: neither class writes into the row they share. */
  it("keeps two classes out of the hour they share", () => {
    const grid = roomScheduleToPdfGrid({
      ...EMPTY,
      Monday: [cell("07:00", "08:30"), cell("08:30", "10:00")],
    });
    const seven = INS_TIME_SLOTS.findIndex((s) => s.startsWith("7:00"));
    expect(grid.Monday[seven]?.line1).toBe("GEE-TEM");
    // The shared 8:00 row carries only the rule at 8:30.
    expect(grid.Monday[seven + 1]?.line1).toBe("");
    expect(grid.Monday[seven + 1]?.partialFill).toBe(0.5);
    expect(grid.Monday[seven + 1]?.startFill).toBe(0.5);
    expect(grid.Monday[NINE_AM]?.line1).toBe("GEE-TEM");
  });

  it("still writes a class contained in one hour into that hour", () => {
    const grid = roomScheduleToPdfGrid({ ...EMPTY, Monday: [cell("08:30", "09:00")] });
    expect(grid.Monday[EIGHT_AM]?.line1).toBe("GEE-TEM");
    expect(grid.Monday[EIGHT_AM]?.startFill).toBe(0.5);
  });

  it("prefers the earlier row when two are equally occupied", () => {
    const grid = roomScheduleToPdfGrid({ ...EMPTY, Monday: [cell("08:30", "09:30")] });
    expect(grid.Monday[EIGHT_AM]?.line1).toBe("GEE-TEM");
    expect(grid.Monday[NINE_AM]?.line1).toBe("");
  });
});
