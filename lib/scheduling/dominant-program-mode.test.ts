import { describe, expect, it } from "vitest";
import { dominantProgramMode } from "./dominant-program-mode";

describe("dominantProgramMode", () => {
  it("reads an evening section from its stamped rows", () => {
    expect(
      dominantProgramMode([{ programMode: "night" }, { programMode: "night" }]),
    ).toBe("night");
  });

  it("reads a day section", () => {
    expect(dominantProgramMode([{ programMode: "day" }, { programMode: "day" }])).toBe("day");
  });

  /** One mis-stamped row must not move a student to the other programme. */
  it("is not decided by a single stray row", () => {
    const mostlyNight = [
      { programMode: "night" },
      { programMode: "night" },
      { programMode: "night" },
      { programMode: "day" },
    ];
    expect(dominantProgramMode(mostlyNight)).toBe("night");
  });

  it("falls to day on a tie, the campus default", () => {
    expect(dominantProgramMode([{ programMode: "night" }, { programMode: "day" }])).toBe("day");
  });

  it("is null when there are no rows, so nothing is guessed", () => {
    expect(dominantProgramMode([])).toBeNull();
  });

  it("infers from the row shape when the mode was never stamped", () => {
    // An evening slot carries the night-day prefix even without an explicit mode.
    expect(dominantProgramMode([{ day: "Night::Monday" }, { day: "Night::Tuesday" }])).toBe("night");
  });
});
