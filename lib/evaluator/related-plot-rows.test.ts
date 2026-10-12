import { describe, expect, it } from "vitest";
import { relatedPlotRows } from "./chairman-plot-row";
import type { PlotRow } from "./chairman-plot-row";

const row = (over: Partial<PlotRow> & { id: string }): PlotRow => ({
  sectionId: "sec-1a",
  students: 40,
  subjectCode: "CC-111",
  lecLabMode: "lec",
  instructorId: "u-1",
  roomId: "r-1",
  startSlotIndex: 0,
  day: "Monday",
  ...over,
});

describe("relatedPlotRows", () => {
  /** Five weekly hours split across three days is one subject, not three. */
  it("gathers every meeting of the same subject for the same section and instructor", () => {
    const rows = [
      row({ id: "a", day: "Monday" }),
      row({ id: "b", day: "Wednesday" }),
      row({ id: "c", day: "Friday" }),
    ];
    expect(relatedPlotRows(rows, rows[0]).map((r) => r.id)).toEqual(["a", "b", "c"]);
  });

  it("leaves out the same subject taught to another section", () => {
    const rows = [row({ id: "a" }), row({ id: "other", sectionId: "sec-2b" })];
    expect(relatedPlotRows(rows, rows[0]).map((r) => r.id)).toEqual(["a"]);
  });

  it("leaves out the same subject under another instructor", () => {
    const rows = [row({ id: "a" }), row({ id: "other", instructorId: "u-2" })];
    expect(relatedPlotRows(rows, rows[0]).map((r) => r.id)).toEqual(["a"]);
  });

  it("leaves out a different subject in the same slot pattern", () => {
    const rows = [row({ id: "a" }), row({ id: "other", subjectCode: "CC-112" })];
    expect(relatedPlotRows(rows, rows[0]).map((r) => r.id)).toEqual(["a"]);
  });

  it("keeps the lecture and laboratory components of one code together", () => {
    const rows = [row({ id: "lec", lecLabMode: "lec" }), row({ id: "lab", lecLabMode: "lab" })];
    expect(relatedPlotRows(rows, rows[0]).map((r) => r.id)).toEqual(["lec", "lab"]);
  });

  it("matches a code regardless of its casing or padding", () => {
    const rows = [row({ id: "a", subjectCode: "cc-111 " }), row({ id: "b", subjectCode: "CC-111" })];
    expect(relatedPlotRows(rows, rows[0]).map((r) => r.id)).toEqual(["a", "b"]);
  });

  /** The clicked row is always offered, even when it is somehow incomplete. */
  it("always includes the row that was clicked", () => {
    const target = row({ id: "blank", subjectCode: "", instructorId: "" });
    expect(relatedPlotRows([target, row({ id: "other" })], target).map((r) => r.id)).toEqual(["blank"]);
  });
});
