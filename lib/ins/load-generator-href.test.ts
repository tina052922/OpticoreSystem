import { describe, expect, it } from "vitest";
import { loadGeneratorHref, periodIdFromLocation } from "./load-generator-href";

describe("loadGeneratorHref", () => {
  it("opens the Load Generator on the section being plotted", () => {
    expect(loadGeneratorHref({ basePath: "/chairman/ins", sectionId: "sec-1" })).toBe(
      "/chairman/ins?tab=section&sectionId=sec-1",
    );
  });

  it("carries the selected term across", () => {
    expect(
      loadGeneratorHref({ basePath: "/admin/college/ins", sectionId: "sec-1", periodId: "ap-2" }),
    ).toBe("/admin/college/ins?tab=section&sectionId=sec-1&periodId=ap-2");
  });

  it("falls back to the Section tab with nothing selected", () => {
    expect(loadGeneratorHref({ basePath: "/doi/ins", sectionId: "" })).toBe("/doi/ins?tab=section");
    expect(loadGeneratorHref({ basePath: "/doi/ins", sectionId: null, periodId: "  " })).toBe(
      "/doi/ins?tab=section",
    );
  });

  it("encodes ids that need it", () => {
    expect(loadGeneratorHref({ basePath: "/chairman/ins", sectionId: "BSIT 1-A/2" })).toBe(
      "/chairman/ins?tab=section&sectionId=BSIT+1-A%2F2",
    );
  });
});

describe("periodIdFromLocation", () => {
  it("reads the term from the current URL", () => {
    expect(periodIdFromLocation("https://opticore.test/chairman/evaluator?periodId=ap-9")).toBe("ap-9");
  });

  it("is blank when there is none, or the URL cannot be parsed", () => {
    expect(periodIdFromLocation("https://opticore.test/chairman/evaluator")).toBe("");
    expect(periodIdFromLocation("not a url")).toBe("");
    expect(periodIdFromLocation("")).toBe("");
  });
});
