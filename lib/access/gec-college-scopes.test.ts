import { describe, expect, it } from "vitest";
import { CHAIRMAN_NAV, GEC_CHAIRMAN_NAV, navEntryHrefs, isNavGroup } from "@/lib/admin-nav";
import type { AdminNavEntry } from "@/lib/admin-nav";

/** Every label a nav shows, headings and the pages under them alike. */
const navLabels = (entries: readonly AdminNavEntry[]): string[] =>
  entries.flatMap((e) => (isNavGroup(e) ? [e.label, ...e.items.map((i) => i.label)] : [e.label]));
import { formatInstructorDepartmentLabel } from "@/lib/auth/instructor-department-label";

describe("GEC Chairman nav", () => {
  it("does not include a Request Access item", () => {
    expect(navLabels(GEC_CHAIRMAN_NAV).some((label) => /request access/i.test(label))).toBe(false);
    expect(navEntryHrefs(GEC_CHAIRMAN_NAV).some((href) => href.includes("request-access"))).toBe(false);
  });
});

describe("Chairman nav", () => {
  it("does not include Schedule change requests", () => {
    expect(navLabels(CHAIRMAN_NAV).some((label) => /schedule change/i.test(label))).toBe(false);
    expect(navEntryHrefs(CHAIRMAN_NAV).some((href) => href.includes("schedule-change"))).toBe(false);
  });
});

describe("formatInstructorDepartmentLabel", () => {
  it("shows college and department together", () => {
    expect(
      formatInstructorDepartmentLabel({
        collegeCode: "COTE",
        collegeName: "College of Technology and Engineering",
        programCode: "BSIT",
        programName: "Bachelor of Science in Information Technology",
      }),
    ).toBe("COTE · BSIT — Bachelor of Science in Information Technology");
  });

  it("falls back to college when department is missing", () => {
    expect(
      formatInstructorDepartmentLabel({
        collegeCode: "COTE",
        collegeName: "College of Technology and Engineering",
      }),
    ).toBe("COTE");
  });
});
