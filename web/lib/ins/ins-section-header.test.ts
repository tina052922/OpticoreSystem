import { describe, expect, it } from "vitest";
import { buildInsSectionHeaderFields } from "@/lib/ins/ins-section-header";
import type { Program, Section, User } from "@/types/db";

describe("buildInsSectionHeaderFields", () => {
  const sectionById = new Map<string, Section>([
    ["sec-1", { id: "sec-1", programId: "prog-1", name: "BSIT 2A", yearLevel: 2, studentCount: 40 }],
  ]);
  const programById = new Map<string, Program>([
    ["prog-1", { id: "prog-1", code: "BSIT", name: "BS Information Technology", collegeId: "col-1" }],
  ]);
  const userById = new Map<string, User>([
    [
      "user-adv",
      {
        id: "user-adv",
        employeeId: "E1",
        email: "adv@test.local",
        name: "Dr. Adviser",
        role: "instructor",
        collegeId: "col-1",
        createdAt: "",
        updatedAt: "",
      },
    ],
  ]);

  it("builds degree/year, assignment, and adviser from faculty profile", () => {
    const result = buildInsSectionHeaderFields({
      sectionId: "sec-1",
      sectionById,
      programById,
      facultyProfiles: [{ userId: "user-adv", fullName: "Dr. Adviser", aka: null, advisorySectionId: "sec-1" }],
      userById,
    });

    expect(result.degreeAndYear).toBe("BSIT — 2nd Year");
    expect(result.assignment).toBe("BSIT 2A");
    expect(result.adviser).toBe("Dr. Adviser");
  });

  it("returns em dash adviser when no profile advises the section", () => {
    const result = buildInsSectionHeaderFields({
      sectionId: "sec-1",
      sectionById,
      programById,
      facultyProfiles: [],
      userById,
    });

    expect(result.adviser).toBe("—");
  });
});
