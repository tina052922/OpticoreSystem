import { describe, expect, it } from "vitest";
import { classifyConflictSeverity } from "./conflict-check";
import type { ConflictHit } from "@/lib/scheduling/types";

function hit(partial: Partial<ConflictHit>): ConflictHit {
  return {
    type: "room",
    message: "m",
    withEntryId: "other",
    ...partial,
  };
}

describe("classifyConflictSeverity", () => {
  it("returns none for empty hits", () => {
    expect(classifyConflictSeverity([])).toBe("none");
  });

  it("returns large when faculty conflict exists", () => {
    const hits: ConflictHit[] = [hit({ type: "faculty" })];
    expect(classifyConflictSeverity(hits)).toBe("large");
  });

  it("returns small for few non-faculty room hits", () => {
    const hits: ConflictHit[] = [hit({ type: "room" }), hit({ type: "room" })];
    expect(classifyConflictSeverity(hits)).toBe("small");
  });

  it("returns large when many room hits", () => {
    const hits: ConflictHit[] = Array.from({ length: 3 }, () => hit({ type: "room" }));
    expect(classifyConflictSeverity(hits)).toBe("large");
  });
});
