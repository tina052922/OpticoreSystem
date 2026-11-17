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
  it("does not offer an already-assigned section from another program", () => {
    expect(advisorySectionsForInstructor(sections, "bsit").map((s) => s.id)).toEqual(["it2a", "it3a"]);
  });
  it("offers every section only for explicit GEC / both-category scope", () => {
    expect(advisorySectionsForInstructor(sections, "bsit", true)).toHaveLength(3);
  });
  it("offers no sections when a program instructor has no home program", () => {
    expect(advisorySectionsForInstructor(sections, null)).toHaveLength(0);
  });
});
