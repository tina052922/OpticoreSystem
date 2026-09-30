import { describe, expect, it } from "vitest";
import {
  advisoryHoldersBySection,
  advisoryTakenLabel,
  canAssignAdvisorySection,
  type AdvisoryAssignment,
} from "./advisory-availability";

const assignments: AdvisoryAssignment[] = [
  { userId: "u-ann", name: "Alberca, Gwyneth", sectionIds: ["sec-1", "sec-2"] },
  { userId: "u-ben", name: "Batumbakal, Marie", sectionIds: ["sec-3"] },
  { userId: "u-cid", name: "Dela Cruz, Juan", sectionIds: [] },
];

describe("advisoryHoldersBySection", () => {
  it("maps each taken section to the faculty holding it", () => {
    const held = advisoryHoldersBySection(assignments);
    expect(held.get("sec-1")?.name).toBe("Alberca, Gwyneth");
    expect(held.get("sec-3")?.name).toBe("Batumbakal, Marie");
    expect(held.has("sec-9")).toBe(false);
  });

  /**
   * The faculty being edited must not block themselves, or opening a profile would show its own
   * advisory as unavailable and un-ticking would be the only way out.
   */
  it("leaves the edited faculty's own sections free", () => {
    const held = advisoryHoldersBySection(assignments, { excludeUserId: "u-ann" });
    expect(held.has("sec-1")).toBe(false);
    expect(held.has("sec-2")).toBe(false);
    expect(held.get("sec-3")?.userId).toBe("u-ben");
  });

  it("ignores a blank exclude id", () => {
    expect(advisoryHoldersBySection(assignments, { excludeUserId: "  " }).has("sec-1")).toBe(true);
    expect(advisoryHoldersBySection(assignments, { excludeUserId: null }).has("sec-1")).toBe(true);
  });

  it("skips blank ids rather than claiming a section called empty string", () => {
    const held = advisoryHoldersBySection([
      { userId: "u-x", name: "X", sectionIds: ["", "  ", "sec-4"] },
      { userId: "", name: "No id", sectionIds: ["sec-5"] },
    ]);
    expect([...held.keys()]).toEqual(["sec-4"]);
  });

  it("keeps the first claim when data already has a duplicate", () => {
    // Two faculty can already hold one section from before this rule existed; the label must not
    // flip between them on re-render.
    const held = advisoryHoldersBySection([
      { userId: "u-1", name: "First", sectionIds: ["sec-1"] },
      { userId: "u-2", name: "Second", sectionIds: ["sec-1"] },
    ]);
    expect(held.get("sec-1")?.name).toBe("First");
  });
});

describe("canAssignAdvisorySection", () => {
  const holders = advisoryHoldersBySection(assignments, { excludeUserId: "u-cid" });

  it("refuses a section another faculty already advises", () => {
    expect(canAssignAdvisorySection("sec-1", { holders, alreadySelected: false })).toBe(false);
  });

  it("allows a free section", () => {
    expect(canAssignAdvisorySection("sec-9", { holders, alreadySelected: false })).toBe(true);
  });

  it("always allows a section already ticked for this faculty, so it can be un-ticked", () => {
    expect(canAssignAdvisorySection("sec-1", { holders, alreadySelected: true })).toBe(true);
  });
});

describe("advisoryTakenLabel", () => {
  it("names who holds it", () => {
    expect(advisoryTakenLabel({ userId: "u-ann", name: "Alberca, Gwyneth" })).toBe(
      "Already advised by Alberca, Gwyneth",
    );
  });

  it("stays readable when the holder has no name on file", () => {
    expect(advisoryTakenLabel({ userId: "u-x", name: "" })).toBe("Already advised by another faculty");
  });

  it("is empty when nothing holds it", () => {
    expect(advisoryTakenLabel(undefined)).toBe("");
  });
});
