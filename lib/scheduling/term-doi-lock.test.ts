import { describe, expect, it } from "vitest";
import { termIsDoiPublished } from "./term-doi-lock";

describe("termIsDoiPublished", () => {
  it("is true when API flag says locked", () => {
    expect(termIsDoiPublished({ doiScheduleLocked: true })).toBe(true);
  });

  it("is true when finalization is approved even with no locked rows", () => {
    expect(
      termIsDoiPublished({
        finalizationStatus: "approved",
        academicPeriodId: "p1",
        entries: [],
      }),
    ).toBe(true);
  });

  it("is true when any term row has lockedByDoiAt", () => {
    expect(
      termIsDoiPublished({
        academicPeriodId: "p1",
        entries: [{ academicPeriodId: "p1", lockedByDoiAt: "2026-01-01T00:00:00Z" }],
      }),
    ).toBe(true);
  });

  it("is false when pending and no locked rows", () => {
    expect(
      termIsDoiPublished({
        doiScheduleLocked: false,
        finalizationStatus: "pending",
        academicPeriodId: "p1",
        entries: [{ academicPeriodId: "p1", lockedByDoiAt: null }],
      }),
    ).toBe(false);
  });
});
