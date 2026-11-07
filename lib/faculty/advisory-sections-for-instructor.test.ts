import { describe, expect, it } from "vitest";
import { advisorySectionsForInstructor } from "./faculty-program-scope";

const sections = [
  { id: "it2a", programId: "bsit" },
  { id: "it3a", programId: "bsit" },
  { id: "ie2a", programId: "bsie" },
];

describe("advisorySectionsForInstructor", () => {
  it("offers only the instructor's own program", () => {
    expect(advisorySectionsForInstructor(sections, "bsit").map((s) => s.id)).toEqual(["it2a", "it3a"]);
  });
  it("keeps an already-assigned section from another program visible", () => {
    expect(advisorySectionsForInstructor(sections, "bsit", ["ie2a"]).map((s) => s.id)).toEqual([
      "it2a",
      "it3a",
      "ie2a",
    ]);
  });
  it("offers every section when the instructor has no program", () => {
    expect(advisorySectionsForInstructor(sections, null)).toHaveLength(3);
  });
});
