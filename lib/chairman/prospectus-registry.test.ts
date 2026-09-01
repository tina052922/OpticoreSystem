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
