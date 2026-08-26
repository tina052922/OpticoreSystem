import { describe, expect, it } from "vitest";
import { INS_DAYS, toInsDay } from "@/components/ins/ins-layout/opticore-ins-constants";
import { facultyScheduleToPdfGrid } from "@/lib/ins/ins-pdf-adapters";
import { weekdaysForSession } from "@/lib/scheduling/program-session";
import type { InsFacultyCell } from "@/lib/ins/build-ins-faculty-view";
import type { InsDay } from "@/components/ins/ins-layout/opticore-ins-constants";

describe("Day Program INS forms print Saturday and Sunday", () => {
  it("keeps seven weekday columns on the paper form", () => {
    expect(INS_DAYS).toEqual([
      "Monday",
      "Tuesday",
      "Wednesday",
      "Thursday",
      "Friday",
      "Saturday",
      "Sunday",
    ]);
  });

  it("maps prefixed weekend days onto those columns", () => {
    expect(toInsDay("Saturday")).toBe("Saturday");
    expect(toInsDay("Night::Sunday")).toBe("Sunday");
  });

  it("puts Saturday cells on the Day Program PDF grid", () => {
    const empty = {} as Record<InsDay, InsFacultyCell[]>;
    for (const d of INS_DAYS) empty[d] = [];
    empty.Saturday = [
      {
        time: "8:00-9:00",
        startTime: "08:00",
        endTime: "09:00",
        course: "IT 101",
        yearSec: "BSIT 1A",
        room: "Lab 1",
      },
    ];
    const grid = facultyScheduleToPdfGrid(empty, "day");
    expect(Object.keys(grid)).toContain("Saturday");
    expect(Object.keys(grid)).toContain("Sunday");
    const sat = grid.Saturday ?? [];
    expect(sat.some((cell) => cell?.line1 === "IT 101")).toBe(true);
  });

  it("does not change Day Evaluator weekdays (still Mon–Fri)", () => {
    expect(weekdaysForSession("day")).toHaveLength(5);
  });
});
