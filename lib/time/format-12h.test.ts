import { describe, expect, it } from "vitest";
import { formatHHMMTo12h, formatTimeRange12h } from "./format-12h";

describe("formatHHMMTo12h", () => {
  it("labels Day Program hours as 12-hour AM/PM", () => {
    expect(formatHHMMTo12h("07:00")).toBe("7:00 AM");
    expect(formatHHMMTo12h("17:00")).toBe("5:00 PM");
    expect(formatTimeRange12h("07:00", "17:00")).toBe("7:00 AM – 5:00 PM");
  });

  it("labels Evening Program weekday and weekend hours as 12-hour AM/PM", () => {
    expect(formatHHMMTo12h("16:00")).toBe("4:00 PM");
    expect(formatHHMMTo12h("22:00")).toBe("10:00 PM");
    expect(formatTimeRange12h("16:00", "22:00")).toBe("4:00 PM – 10:00 PM");
    expect(formatTimeRange12h("07:00", "22:00")).toBe("7:00 AM – 10:00 PM");
  });

  it("does not leave 24-hour labels like 16:00 in display text", () => {
    expect(formatHHMMTo12h("16:00")).not.toContain("16:00");
    expect(formatTimeRange12h("13:00", "16:00")).not.toMatch(/\b16:00\b/);
  });
});
