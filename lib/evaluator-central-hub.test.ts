import { describe, expect, it } from "vitest";
import { gecHubCollegeTiles, hubCollegesListHref, isHubCollegeListView } from "./evaluator-central-hub";

describe("central hub college list navigation", () => {
  it("uses an explicit view query so Colleges does not keep the prior college", () => {
    expect(hubCollegesListHref("/admin/college/evaluator")).toBe(
      "/admin/college/evaluator?view=colleges",
    );
    expect(isHubCollegeListView("colleges", "cote")).toBe(true);
    expect(isHubCollegeListView(null, "cote")).toBe(false);
    expect(isHubCollegeListView(null, null)).toBe(true);
  });

  it("GEC always sees hub colleges even when the catalog bundle is empty", () => {
    const empty = gecHubCollegeTiles([]);
    expect(empty.length).toBeGreaterThanOrEqual(5);
    expect(empty.some((c) => c.name.includes("Technology"))).toBe(true);
    const withDb = gecHubCollegeTiles([{ id: "col-tech-eng", name: "COTE (live)" }]);
    expect(withDb.find((c) => c.id === "col-tech-eng")?.name).toBe("COTE (live)");
  });
});
