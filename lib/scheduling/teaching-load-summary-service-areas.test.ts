import { describe, expect, it } from "vitest";
import { buildTeachingLoadSummaryByServiceArea } from "@/lib/scheduling/teaching-load-summary";
import { buildTeachingLoadSignatories } from "@/lib/scheduling/teaching-load-signatories";
import type { ScheduleEntry, Subject, User } from "@/types/db";

const PERIOD = "p1";
const areas = [
  { id: "a-hss", code: "hss", name: "Humanities and Social Sciences" },
  { id: "a-pe", code: "pe", name: "PE and Sports" },
];
const subj = (id: string, code: string, category: string | null): Subject =>
  ({ id, code, title: code, lecUnits: 3, labUnits: 0, lecHours: 3, labHours: 0, programId: "x", yearLevel: 1, category }) as Subject;
const subjects = [subj("s-gec", "BSP-GEC-MMW", "gec"), subj("s-pe", "PATHFit 2", "pe"), subj("s-major", "PSYCH-BC 122", null)];
const user = (id: string, name: string, serviceAreaId: string | null, role = "instructor"): User =>
  ({ id, name, email: `${id}@x`, role, serviceAreaId, instructorValidation: "active", facultyCategory: "gec" }) as unknown as User;
const entry = (id: string, instructorId: string, subjectId: string): ScheduleEntry =>
  ({ id, academicPeriodId: PERIOD, instructorId, subjectId, sectionId: "sec", roomId: "r", day: "Monday", startTime: "07:00", endTime: "10:00", programMode: "day" }) as unknown as ScheduleEntry;

describe("buildTeachingLoadSummaryByServiceArea", () => {
  const users = [
    user("u1", "Ana", "a-hss"),
    user("u2", "Ben", "a-pe"),
    user("u3", "Cy", null),
    user("chair", "Hss Chair", "a-hss", "gec_chairman"),
  ];
  const groups = buildTeachingLoadSummaryByServiceArea({
    areas,
    academicPeriodId: PERIOD,
    entries: [entry("e1", "u1", "s-gec"), entry("e2", "u1", "s-major"), entry("e3", "u2", "s-pe")],
    users,
    profiles: [],
    subjects,
    justifications: [],
  });

  it("lists each area's instructors with their whole load", () => {
    expect(groups.map((g) => g.categoryLabel)).toEqual(["Humanities and Social Sciences", "PE and Sports"]);
    const hss = groups[0]!;
    // The area's Service Chair teaches too, so they are listed with their own load.
    expect(hss.rows.map((r) => r.facultyName)).toEqual(["Ana", "Hss Chair"]);
    expect(hss.rows[0]!.subjectsHandled).toBe("BSP-GEC-MMW, PSYCH-BC 122");
    expect(hss.rows[0]!.totalHoursPerWeek).toBe(6);
    expect(groups[1]!.rows.map((r) => r.facultyName)).toEqual(["Ben"]);
  });

  it("is prepared by the area's Service Chair", () => {
    const sig = buildTeachingLoadSignatories({ college: null, groups: [groups[0]!], users });
    expect(sig.preparedBy[0]).toMatchObject({ name: "Hss Chair", title: "Service Chair, Humanities and Social Sciences" });
  });
});

import { otherResponsibilitiesFromProfile } from "@/lib/scheduling/teaching-load-summary";
import type { FacultyProfile } from "@/types/db";

describe("otherResponsibilitiesFromProfile", () => {
  const p = (v: Partial<FacultyProfile>) => v as FacultyProfile;
  it("treats N/A and similar placeholders as empty", () => {
    expect(otherResponsibilitiesFromProfile(p({ research: "N/A", extension: "n/a", production: "NA", specialTraining: "-" }))).toBe("—");
  });
  it("keeps real entries and drops placeholders", () => {
    expect(otherResponsibilitiesFromProfile(p({ research: "Thesis adviser", extension: "N/A" }))).toBe("Thesis adviser");
  });
});

describe("service area — Both instructor", () => {
  it("counts the whole load (general + program subjects)", () => {
    const both = { ...user("u9", "Juan", "a-hss"), facultyCategory: "both" } as unknown as User;
    const [hss] = buildTeachingLoadSummaryByServiceArea({
      areas: [areas[0]!],
      academicPeriodId: PERIOD,
      entries: [entry("b1", "u9", "s-gec"), entry("b2", "u9", "s-major")],
      users: [both],
      profiles: [],
      subjects,
      justifications: [],
    });
    const row = hss!.rows[0]!;
    expect(row.totalPreps).toBe(2);
    expect(row.subjectsHandled).toBe("BSP-GEC-MMW, PSYCH-BC 122");
    expect(row.totalHoursPerWeek).toBe(6);
  });
});
