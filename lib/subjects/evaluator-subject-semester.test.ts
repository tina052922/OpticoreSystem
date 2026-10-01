import { describe, expect, it } from "vitest";
import { catalogSubjectsToProspectusRows } from "@/lib/chairman/prospectus-registry";
import { filterSubjectsBySemester, semesterFilterForPeriod } from "./subject-semester-filter";
import type { AcademicPeriod, Subject } from "@/types/db";

const subject = (code: string, semester: number | null): Subject =>
  ({
    id: code,
    code,
    title: code,
    programId: "prog-bsit",
    yearLevel: 1,
    semester,
    lecUnits: 3,
    lecHours: 3,
    labUnits: 0,
    labHours: 0,
  }) as unknown as Subject;

const catalog = [subject("CC-111", 1), subject("CC-123", 2), subject("AutoTech-111", null)];

const period = (name: string) => ({ id: "ap", name } as unknown as AcademicPeriod);

/**
 * The Evaluator's subject picker is narrowed on `Subject` itself, before the row conversion.
 *
 * `catalogSubjectsToProspectusRows` cannot express "no semester recorded" — it files those subjects
 * under the 1st semester — so narrowing after the conversion would hide every unset subject for the
 * whole of the 2nd. Roughly two in five subjects in the catalog have no semester recorded.
 */
describe("evaluator subject catalog, narrowed by the sidebar term", () => {
  function rowsFor(periodName: string) {
    const filtered = filterSubjectsBySemester(catalog, semesterFilterForPeriod(period(periodName)));
    return catalogSubjectsToProspectusRows(filtered).map((r) => r.code);
  }

  it("offers 1st-semester subjects in a 1st-semester term", () => {
    const codes = rowsFor("1st Semester, AY 2026-2027");
    expect(codes).toContain("CC-111");
    expect(codes).not.toContain("CC-123");
  });

  it("offers 2nd-semester subjects in a 2nd-semester term", () => {
    const codes = rowsFor("2nd Semester, AY 2026-2027");
    expect(codes).toContain("CC-123");
    expect(codes).not.toContain("CC-111");
  });

  /** The reason the filter runs before the conversion rather than after it. */
  it("keeps a subject with no semester recorded in both terms", () => {
    expect(rowsFor("1st Semester, AY 2026-2027")).toContain("AutoTech-111");
    expect(rowsFor("2nd Semester, AY 2026-2027")).toContain("AutoTech-111");
  });

  it("offers everything when the term does not say which semester it is", () => {
    const codes = rowsFor("Midyear");
    expect(codes).toEqual(expect.arrayContaining(["CC-111", "CC-123", "AutoTech-111"]));
  });

  it("would have hidden the unset subject had it been narrowed after the conversion", () => {
    // Documents the trap: the conversion defaults an unrecorded semester to 1.
    const converted = catalogSubjectsToProspectusRows(catalog);
    expect(converted.find((r) => r.code === "AutoTech-111")?.semester).toBe(1);
  });
});
