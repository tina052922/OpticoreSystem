import { describe, expect, it } from "vitest";
import type { EnrichedCampusIssue } from "@/lib/scheduling/conflict-enrichment";
import { conflictSummaryLine } from "@/lib/scheduling/conflict-enrichment";

function mkIssue(type: EnrichedCampusIssue["type"]): EnrichedCampusIssue {
  return {
    key: `${type}:a:b`,
    type,
    rootCause: "root",
    rowA: {
      entryId: "a",
      what: "CC 112 · BSIT 1B",
      when: "Monday 8:00 AM–9:00 AM",
      where: "IT LAB 2",
      who: "Prof A",
      collegeName: "CTE",
    },
    rowB: {
      entryId: "b",
      what: "IT 101 · BSIT 1A",
      when: "Monday 8:00 AM–9:00 AM",
      where: "IT LAB 2",
      who: "Prof B",
      collegeName: "CTE",
    },
  };
}

describe("conflictSummaryLine", () => {
  it("formats room conflicts with room, subject, section and time", () => {
    const line = conflictSummaryLine(mkIssue("room"));
    expect(line).toContain("Room IT LAB 2");
    expect(line).toContain("IT 101 (BSIT 1A)");
    expect(line).toContain("Monday 8:00 AM–9:00 AM");
  });

  it("formats faculty conflicts with instructor, subject, section and time", () => {
    const line = conflictSummaryLine(mkIssue("faculty"));
    expect(line).toContain("Instructor Prof A");
    expect(line).toContain("IT 101 (BSIT 1A)");
    expect(line).toContain("Monday 8:00 AM–9:00 AM");
  });

  it("formats section conflicts with section, subject and time", () => {
    const line = conflictSummaryLine(mkIssue("section"));
    expect(line).toContain("Section BSIT 1B");
    expect(line).toContain("IT 101");
    expect(line).toContain("Monday 8:00 AM–9:00 AM");
  });
});

