import { describe, expect, it } from "vitest";
import {
  addMinutesToTimeInput,
  meetingDurationMinutes,
  timeToMinutes,
  toTimeInputValue,
} from "./request-times";

describe("schedule-change request times", () => {
  it("does not throw on missing startTime / endTime", () => {
    expect(timeToMinutes(undefined)).toBe(0);
    expect(timeToMinutes(null)).toBe(0);
    expect(toTimeInputValue(undefined)).toBe("00:00");
    expect(meetingDurationMinutes(undefined, undefined)).toBe(30);
  });

  it("keeps the original duration when shifting start", () => {
    const dur = meetingDurationMinutes("08:00", "11:00");
    expect(dur).toBe(180);
    expect(addMinutesToTimeInput("13:00", dur)).toBe("16:00");
  });
});
