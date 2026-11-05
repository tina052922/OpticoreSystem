import { describe, expect, it } from "vitest";
import { DAY_PLOT_SLOTS } from "@/lib/scheduling/program-mode";
import { plotFreeTimeNotice, sectionFreeTimeFrom } from "./plot-free-time";

const block = (id: string, day: string, startTime: string, endTime: string, sectionId = "s4a") => ({
  id,
  academicPeriodId: "p",
  day,
  startTime,
  endTime,
  instructorId: null,
  sectionId,
  roomId: null,
});

const blocks = [block("a", "Monday", "10:00", "11:00"), block("b", "Monday", "08:00", "09:00")];
const free = (startTime: string, b = blocks) =>
  sectionFreeTimeFrom({ sectionId: "s4a", day: "Monday", startTime, blocks: b, slots: DAY_PLOT_SLOTS });

describe("sectionFreeTimeFrom", () => {
  it("measures up to the section's next class", () => {
    expect(free("09:30")).toMatchObject({ freeMinutes: 30, until: "class", untilLabel: "10:00 AM" });
    expect(free("09:00")).toMatchObject({ freeMinutes: 60, until: "class" });
  });

  it("stops at lunch and at the end of the day", () => {
    expect(free("11:30")).toMatchObject({ freeMinutes: 30, until: "lunch" });
    expect(free("16:30")).toMatchObject({ freeMinutes: 30, until: "end" });
  });

  it("ignores other sections and other days", () => {
    const other = [block("x", "Monday", "10:00", "11:00", "s3a"), block("y", "Tuesday", "10:00", "11:00")];
    expect(free("09:30", other)).toMatchObject({ freeMinutes: 150, until: "lunch" });
  });

  it("returns null when the start is already taken", () => {
    expect(free("10:30")).toBeNull();
  });
});

describe("plotFreeTimeNotice", () => {
  it("explains a 30 minute gap", () => {
    const msg = plotFreeTimeNotice({ day: "Monday", startTime: "09:30", durationHours: 1, free: free("09:30") });
    expect(msg).toBe(
      "Only 30 min free on Monday from 9:30 AM (next class at 10:00 AM). A meeting must be 1 hr or 1.5 hrs, so pick another start time.",
    );
  });

  it("asks for 1 hr when 1.5 does not fit", () => {
    const msg = plotFreeTimeNotice({ day: "Monday", startTime: "09:00", durationHours: 1.5, free: free("09:00") });
    expect(msg).toContain("Choose 1 hr");
  });

  it("is silent when the meeting fits", () => {
    expect(plotFreeTimeNotice({ day: "Monday", startTime: "09:00", durationHours: 1, free: free("09:00") })).toBeNull();
  });
});
