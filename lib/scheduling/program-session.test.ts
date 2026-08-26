import { describe, expect, it } from "vitest";
import {
  entryMatchesSession,
  inferProgramSession,
  isNightCellClosed,
  slotsForSession,
  weekdaysForSession,
} from "./program-session";

describe("program session", () => {
  it("keeps Day evaluator on weekday daytime hours", () => {
    expect(weekdaysForSession("day")).toHaveLength(5);
    expect(slotsForSession("day")[0]?.startTime).toBe("07:00");
    expect(slotsForSession("day").at(-1)?.endTime).toBe("17:00");
  });

  it("uses Mon–Sun and Closed weekday mornings for Night", () => {
    expect(weekdaysForSession("night")).toContain("Sunday");
    expect(isNightCellClosed("night", "Monday", "09:00")).toBe(true);
    expect(isNightCellClosed("night", "Monday", "16:00")).toBe(false);
    expect(isNightCellClosed("night", "Saturday", "08:00")).toBe(false);
  });

  it("infers night from weekend or after 5:00 PM, not from Day 4:00 PM", () => {
    expect(inferProgramSession({ day: "Monday", startTime: "08:00" })).toBe("day");
    expect(inferProgramSession({ day: "Monday", startTime: "16:00" })).toBe("day");
    expect(inferProgramSession({ day: "Monday", startTime: "17:00" })).toBe("night");
    expect(inferProgramSession({ day: "Sunday", startTime: "08:00" })).toBe("night");
    expect(entryMatchesSession({ programSession: "night", startTime: "08:00", day: "Monday" }, "night")).toBe(true);
    expect(entryMatchesSession({ programSession: "day", startTime: "16:00", day: "Monday" }, "day")).toBe(true);
  });
});
