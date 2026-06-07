import { describe, expect, it } from "vitest";
import {
  insSlotBoundsMinutes,
  insSpanRangeFromMinutes,
  insPickSlotRender,
} from "@/lib/ins/ins-weekly-grid-span";

describe("insSlotBoundsMinutes", () => {
  it("parses morning slots as AM", () => {
    expect(insSlotBoundsMinutes("7:00-8:00")).toEqual({ startMin: 7 * 60, endMin: 8 * 60 });
    expect(insSlotBoundsMinutes("11:00-12:00")).toEqual({ startMin: 11 * 60, endMin: 12 * 60 });
  });

  it("parses lunch slot as noon to 1 PM", () => {
    expect(insSlotBoundsMinutes("12:00-1:00")).toEqual({ startMin: 12 * 60, endMin: 13 * 60 });
  });

  it("parses afternoon labels as PM", () => {
    expect(insSlotBoundsMinutes("1:00-2:00")).toEqual({ startMin: 13 * 60, endMin: 14 * 60 });
    expect(insSlotBoundsMinutes("6:00-7:00")).toEqual({ startMin: 18 * 60, endMin: 19 * 60 });
  });
});

describe("insSpanRangeFromMinutes", () => {
  it("maps 13:00-14:00 to the 1:00-2:00 row", () => {
    const span = insSpanRangeFromMinutes(13 * 60, 14 * 60);
    expect(span?.startIdx).toBe(6);
    expect(span?.rowSpan).toBe(1);
  });

  it("does not place afternoon classes in the lunch row", () => {
    const span = insSpanRangeFromMinutes(15 * 60, 16 * 60);
    expect(span?.startIdx).toBe(8);
    expect(span?.startIdx).not.toBe(5);
  });
});

describe("insPickSlotRender", () => {
  it("skips covered rowspan cells", () => {
    const pick = insPickSlotRender(
      "Monday",
      1,
      [
        {
          time: "7:00-9:00",
          startTime: "07:00",
          endTime: "09:00",
          course: "IT 101",
          yearSec: "BSIT 1A",
          room: "201",
        },
      ],
      {},
    );
    expect(pick.kind).toBe("skip");
  });
});
