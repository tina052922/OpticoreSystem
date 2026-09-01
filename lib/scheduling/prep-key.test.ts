import { describe, expect, it } from "vitest";
import { subjectPrepKey } from "./prep-key";

describe("subjectPrepKey", () => {
  it("treats lecture and lab of the same course as one prep", () => {
    expect(subjectPrepKey("CC112")).toBe("CC112");
    expect(subjectPrepKey("CC-112")).toBe("CC112");
    expect(subjectPrepKey("CC112L")).toBe("CC112");
    expect(subjectPrepKey("CC-112L")).toBe("CC112");
    expect(subjectPrepKey("CC 112 Lab")).toBe("CC112");
  });

  it("keeps unrelated codes distinct", () => {
    expect(subjectPrepKey("IT 101")).toBe("IT101");
    expect(subjectPrepKey("IT 102")).toBe("IT102");
  });
});
