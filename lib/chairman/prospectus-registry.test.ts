import { describe, expect, it } from "vitest";
import { BSIT_PROGRAM_CODE } from "./bsit-prospectus";
import {
  catalogSubjectsToProspectusRows,
  getProspectusSubjectsForProgram,
  hasProspectusForProgram,
  prospectusSubjectsForProgramYearAndSemester,
} from "./prospectus-registry";
import type { Subject } from "@/types/db";

describe("prospectusSubjectsForProgramYearAndSemester", () => {
  it("returns BSIT rows for BSIT, not for BIT/BSIE program codes", () => {
    const bsit = prospectusSubjectsForProgramYearAndSemester(BSIT_PROGRAM_CODE, 1, 1);
    expect(bsit.length).toBeGreaterThan(0);
    expect(bsit.every((s) => s.yearLevel === 1 && s.semester === 1)).toBe(true);

    expect(prospectusSubjectsForProgramYearAndSemester("BIT-AUTO", 1, 1)).toEqual([]);
    expect(prospectusSubjectsForProgramYearAndSemester("BSIE", 1, 1)).toEqual([]);
    expect(hasProspectusForProgram("BIT-DT")).toBe(false);
    expect(getProspectusSubjectsForProgram("BSIE")).toEqual([]);
  });
});

describe("catalogSubjectsToProspectusRows hours and year", () => {
  function subject(over: Partial<Subject> & Pick<Subject, "id" | "code">): Subject {
    return {
      subcode: null,
      title: over.code,
      lecUnits: 0,
      lecHours: 0,
      labUnits: 0,
      labHours: 0,
      programId: "prog-1",
      yearLevel: 1,
      ...over,
    } as Subject;
  }

  it("keeps the hours stored on the subject, which are editable per row", () => {
    const [row] = catalogSubjectsToProspectusRows([
      subject({ id: "s1", code: "CC-111", lecUnits: 2, lecHours: 5, labUnits: 1, labHours: 2 }),
    ]);
    expect(row).toMatchObject({ lecHours: 5, labHours: 2 });
  });

  it("falls back to the unit conversion when hours are not stored", () => {
    const [row] = catalogSubjectsToProspectusRows([
      subject({ id: "s1", code: "CC-111", lecUnits: 2, lecHours: null, labUnits: 1, labHours: null } as never),
    ]);
    expect(row).toMatchObject({ lecHours: 2, labHours: 3 });
  });

  it("keeps year levels beyond the fourth instead of clamping them", () => {
    const [row] = catalogSubjectsToProspectusRows([subject({ id: "s1", code: "MD-501", yearLevel: 5 })]);
    expect(row.yearLevel).toBe(5);
  });
});

describe("catalogSubjectsToProspectusRows", () => {
  it("maps catalog subjects into curriculum rows by year and semester", () => {
    const subjects: Subject[] = [
      {
        id: "1",
        code: "AT 101",
        subcode: null,
        title: "Automotive Fundamentals",
        lecUnits: 3,
        lecHours: 3,
        labUnits: 0,
        labHours: 0,
        programId: "prog-bit-auto",
        yearLevel: 1,
        semester: 1,
      },
      {
        id: "2",
        code: "at 101",
        subcode: null,
        title: "duplicate",
        lecUnits: 3,
        lecHours: 3,
        labUnits: 0,
        labHours: 0,
        programId: "prog-bit-auto",
        yearLevel: 1,
        semester: 1,
      },
    ];
    const rows = catalogSubjectsToProspectusRows(subjects);
    expect(rows).toHaveLength(1);
    expect(rows[0].code).toBe("AT 101");
    expect(rows[0].yearLevel).toBe(1);
    expect(rows[0].semester).toBe(1);
  });
});
