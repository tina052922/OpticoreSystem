import { describe, expect, it } from "vitest";
import {
  gecHubCollegeTiles,
  hubCollegesFromDb,
  hubCollegesListHref,
  hubHref,
  isHubCollegeListView,
  resolveHubCollege,
} from "./evaluator-central-hub";

describe("central hub college list navigation", () => {
  it("uses an explicit view query so Colleges does not keep the prior college", () => {
    expect(hubCollegesListHref("/admin/college/evaluator?college=cote&panel=timetabling")).toBe(
      "/admin/college/evaluator?view=colleges",
    );
    expect(isHubCollegeListView("colleges", "cote")).toBe(true);
    expect(isHubCollegeListView(null, "cote")).toBe(false);
    expect(isHubCollegeListView(null, null)).toBe(true);
  });

  /**
   * DOI reaches the hub at `/doi/evaluator?hub=1`, sharing the route with their campus-wide plotter.
   * Building links as `${basePath}?college=…` dropped that flag, so clicking a college left the hub
   * for the plotter — which ignores `?college=` and lists every program. Picking CAS showed COTE.
   */
  it("keeps a flag the base path carries, so a tile click stays inside the hub", () => {
    expect(hubHref("/doi/evaluator?hub=1", { college: "cas" })).toBe(
      "/doi/evaluator?hub=1&college=cas",
    );
    expect(hubCollegesListHref("/doi/evaluator?hub=1")).toBe("/doi/evaluator?hub=1&view=colleges");
    expect(hubHref("/doi/evaluator?hub=1", { college: "cote", panel: "hrs" })).toBe(
      "/doi/evaluator?hub=1&college=cote&panel=hrs",
    );
  });

  it("replaces the params the hub owns rather than appending a second one", () => {
    // Switching college from inside a college view must not leave the old one in the URL.
    expect(hubHref("/doi/evaluator?hub=1&college=cote&panel=hrs", { college: "cas" })).toBe(
      "/doi/evaluator?hub=1&college=cas",
    );
    expect(hubHref("/admin/cas/evaluator?college=cote", { view: "colleges" })).toBe(
      "/admin/cas/evaluator?view=colleges",
    );
  });

  it("drops empty values and encodes what it is given", () => {
    expect(hubHref("/doi/evaluator?hub=1", { college: "cas", panel: null })).toBe(
      "/doi/evaluator?hub=1&college=cas",
    );
    expect(hubHref("/doi/evaluator", {})).toBe("/doi/evaluator");
    // Call sites pass raw values; pre-encoding here would double-encode.
    expect(hubHref("/doi/evaluator", { college: "col a&b" })).toBe(
      "/doi/evaluator?college=col+a%26b",
    );
  });

  it("uses live DB names and includes newly added colleges", () => {
    const tiles = hubCollegesFromDb([
      { id: "col-tech-eng", code: "COTE", name: "COTE Renamed" },
      { id: "col-new", code: "NEWC", name: "New College of Testing" },
    ]);
    expect(tiles.find((c) => c.collegeId === "col-tech-eng")?.name).toBe("COTE Renamed");
    expect(tiles.find((c) => c.collegeId === "col-tech-eng")?.slug).toBe("cote");
    expect(tiles.some((c) => c.collegeId === "col-new" && c.name === "New College of Testing")).toBe(true);
  });

  it("resolves hub by slug, id, or code", () => {
    const db = [
      { id: "col-tech-eng", code: "COTE", name: "COTE Live" },
      { id: "col-new", code: "NEWC", name: "New College" },
    ];
    expect(resolveHubCollege("cote", db)?.collegeId).toBe("col-tech-eng");
    expect(resolveHubCollege("col-new", db)?.name).toBe("New College");
    expect(resolveHubCollege("NEWC", db)?.collegeId).toBe("col-new");
  });

  it("GEC landing prefers live catalog names and includes extras", () => {
    const empty = gecHubCollegeTiles([]);
    expect(empty.length).toBeGreaterThanOrEqual(5);
    const withDb = gecHubCollegeTiles([
      { id: "col-tech-eng", code: "COTE", name: "COTE (live)" },
      { id: "col-extra", code: "X", name: "Extra College" },
    ]);
    expect(withDb.find((c) => c.id === "col-tech-eng")?.name).toBe("COTE (live)");
    expect(withDb.some((c) => c.id === "col-extra")).toBe(true);
  });
});
