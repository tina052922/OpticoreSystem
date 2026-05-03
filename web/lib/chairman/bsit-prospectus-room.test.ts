import { describe, expect, it } from "vitest";

import { isBsitPlotEligibleRoom } from "@/lib/chairman/bsit-prospectus";

describe("isBsitPlotEligibleRoom", () => {
  it("accepts legacy Science & Tech IT LAB codes", () => {
    expect(
      isBsitPlotEligibleRoom({
        code: "IT LAB 1",
        displayName: null,
        building: "Science and Technology Building",
      }),
    ).toBe(true);
  });

  it("accepts COTE Building rows identified by IT Lab display names (campus navigation seed)", () => {
    expect(
      isBsitPlotEligibleRoom({
        code: "COTE 305",
        displayName: "IT Lab 01",
        building: "COTE Building",
      }),
    ).toBe(true);
    expect(
      isBsitPlotEligibleRoom({
        code: "COTE 302",
        displayName: "IT Lab 04",
        building: "COTE Building",
      }),
    ).toBe(true);
  });

  it("rejects non–IT-lab COTE rooms", () => {
    expect(
      isBsitPlotEligibleRoom({
        code: "COTE 102",
        displayName: "FAB Lab",
        building: "COTE Building",
      }),
    ).toBe(false);
  });
});
