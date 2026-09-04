import { describe, expect, it } from "vitest";
import { CHAIRMAN_NAV, GEC_CHAIRMAN_NAV } from "@/lib/admin-nav";
import { GEC_COLLEGE_ACCESS_SCOPES } from "./gec-college-scopes";
import { formatInstructorDepartmentLabel } from "@/lib/auth/instructor-department-label";

describe("GEC Chairman nav", () => {
  it("does not include a Request Access item", () => {
    expect(GEC_CHAIRMAN_NAV.some((item) => /request access/i.test(item.label))).toBe(false);
    expect(GEC_CHAIRMAN_NAV.some((item) => item.href.includes("request-access"))).toBe(false);
  });
});

describe("Chairman nav", () => {
  it("does not include Schedule change requests", () => {
    expect(CHAIRMAN_NAV.some((item) => /schedule change/i.test(item.label))).toBe(false);
    expect(CHAIRMAN_NAV.some((item) => item.href.includes("schedule-change"))).toBe(false);
  });
});

describe("GEC_COLLEGE_ACCESS_SCOPES", () => {
  it("covers evaluator, INS, and vacant GEC slots in one request", () => {
    expect(GEC_COLLEGE_ACCESS_SCOPES).toEqual(["evaluator", "ins_forms", "gec_vacant_slots"]);
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
