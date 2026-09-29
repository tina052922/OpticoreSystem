import { describe, expect, it } from "vitest";
import {
  formatPlotSubjectDropdownLabel,
  getLecLabPair,
  inferLecLabMode,
  lecLabModesAvailable,
  resolveSubjectCodeForLecLabMode,
  subjectRowFor,
  subjectRowsForPlotDropdown,
  subjectsForSectionPlot,
} from "@/lib/evaluator/chairman-plot-leclab";
import { getProspectusSubjectsForProgram } from "@/lib/chairman/prospectus-registry";
import { normalizePlotRow } from "@/lib/evaluator/chairman-plot-row";
import type { ProspectusSubjectRow } from "@/lib/chairman/bsit-prospectus";

describe("chairman-plot-leclab", () => {
  it("collapses BSIT lec/lab twins to one dropdown option labeled by code only", () => {
    const rows = getProspectusSubjectsForProgram("BSIT").filter(
      (r) => r.yearLevel === 1 && r.semester === 1,
    );
    const options = subjectRowsForPlotDropdown("BSIT", rows);
    const codes = options.map((r) => r.code);
    expect(codes).toContain("CC-112");
    expect(codes).not.toContain("CC-112L");
    expect(formatPlotSubjectDropdownLabel(options.find((r) => r.code === "CC-112")!)).toBe("CC-112");
    expect(formatPlotSubjectDropdownLabel(options.find((r) => r.code === "CC-112")!)).not.toMatch(/Lec|Lab/i);
  });

  it("enables Lec/Lab for BSIT paired codes and resolves both ways", () => {
    expect(lecLabModesAvailable("BSIT", "CC-112")).toEqual(["lec", "lab"]);
    expect(resolveSubjectCodeForLecLabMode("BSIT", "CC-112", "lab")).toBe("CC-112L");
    expect(resolveSubjectCodeForLecLabMode("BSIT", "CC-112L", "lec")).toBe("CC-112");
    expect(inferLecLabMode("BSIT", "CC-112")).toBe("lec");
    expect(inferLecLabMode("BSIT", "CC-112L")).toBe("lab");
    expect(getLecLabPair("BSIT", "CC-112L")).toMatchObject({
      lecCode: "CC-112",
      labCode: "CC-112L",
      mode: "lab",
    });
  });

  it("keeps Lec/Lab selectable after switching to a BSENVS lab twin (labUnits may be 0)", () => {
    const lec = "BSENVS-ENCSC111";
    const lab = "BSENVS-ENCSC111L";
    expect(lecLabModesAvailable("BSENVS", lec)).toEqual(["lec", "lab"]);
    expect(resolveSubjectCodeForLecLabMode("BSENVS", lec, "lab")).toBe(lab);
    expect(inferLecLabMode("BSENVS", lab)).toBe("lab");
    expect(lecLabModesAvailable("BSENVS", lab)).toEqual(["lec", "lab"]);
    expect(resolveSubjectCodeForLecLabMode("BSENVS", lab, "lec")).toBe(lec);
  });

  it("normalizes hydrated plot rows so lab subject codes show as Laboratory", () => {
    const row = normalizePlotRow(
      {
        id: "1",
        sectionId: "s",
        students: "",
        subjectCode: "CC-112L",
        lecLabMode: "lec",
        instructorId: "i",
        roomId: "r",
        startSlotIndex: 0,
        day: "Monday",
      },
      "BSIT",
    );
    expect(row.lecLabMode).toBe("lab");
  });

  /**
   * Subjects that exist only in Subject Codes, not in the built-in prospectus. AP-6 is the case the
   * chairman hit: 3 lec units and 3 lab units, but no prospectus row, so every helper drew a blank
   * and the Lec/Lab select had nothing to offer.
   */
  const catalogOnly: ProspectusSubjectRow[] = [
    {
      code: "AP-6",
      title: "Animal Production 6",
      lecUnits: 3,
      lecHours: 2,
      labUnits: 3,
      labHours: 3,
      yearLevel: 3,
      semester: 1,
    },
    {
      code: "AP-7",
      title: "Animal Production 7",
      lecUnits: 3,
      lecHours: 3,
      labUnits: 0,
      labHours: 0,
      yearLevel: 3,
      semester: 1,
    },
  ];

  it("offers both modes for a Subject Codes subject carrying lec and lab", () => {
    expect(lecLabModesAvailable("BSA", "AP-6", catalogOnly)).toEqual(["lec", "lab"]);
    expect(lecLabModesAvailable("BSA", "AP-7", catalogOnly)).toEqual(["lec"]);
  });

  it("keeps an explicit lab choice on a Subject Codes subject", () => {
    const row = normalizePlotRow(
      {
        id: "1",
        sectionId: "s",
        students: "",
        subjectCode: "AP-6",
        lecLabMode: "lab",
        instructorId: "i",
        roomId: "r",
        startSlotIndex: 0,
        day: "Monday",
      },
      "BSA",
      catalogOnly,
    );
    expect(row.lecLabMode).toBe("lab");
  });

  it("resolves the code unchanged when the subject has no separate lab twin", () => {
    expect(resolveSubjectCodeForLecLabMode("BSA", "AP-6", "lab", catalogOnly)).toBe("AP-6");
    expect(inferLecLabMode("BSA", "AP-6", catalogOnly)).toBe("lec");
  });

  it("still offers lecture when the subject is in neither source", () => {
    // Better a plottable lecture than an empty select the chairman cannot get past.
    expect(lecLabModesAvailable("BSA", "ZZ-999")).toEqual(["lec"]);
    expect(lecLabModesAvailable("BSA", "")).toEqual([]);
  });

  /**
   * AP-6 is a real row: it sits under BSIT, which ships a static prospectus, so the dropdown's old
   * prospectus-or-catalog rule hid it entirely and it could never be plotted.
   */
  it("offers Subject Codes rows alongside the prospectus for a program that has one", () => {
    const apSix: ProspectusSubjectRow = {
      code: "AP-6",
      title: "AP-6",
      lecUnits: 3,
      lecHours: 2,
      labUnits: 3,
      labHours: 3,
      yearLevel: 4,
      semester: 1,
    };
    const rows = subjectsForSectionPlot({
      programCode: "BSIT",
      yearLevel: 4,
      termSemester: 1,
      catalogRows: [apSix],
    });
    const codes = rows.map((r) => r.code);
    expect(codes).toContain("AP-6");
    // The prospectus rows for that year/semester are still there.
    expect(rows.length).toBeGreaterThan(1);
    expect(lecLabModesAvailable("BSIT", "AP-6", [apSix])).toEqual(["lec", "lab"]);
  });

  it("keeps a Subject Codes row out of a section it does not belong to", () => {
    const apSix: ProspectusSubjectRow = {
      code: "AP-6",
      title: "AP-6",
      lecUnits: 3,
      lecHours: 2,
      labUnits: 3,
      labHours: 3,
      yearLevel: 4,
      semester: 1,
    };
    const firstYear = subjectsForSectionPlot({
      programCode: "BSIT",
      yearLevel: 1,
      termSemester: 1,
      catalogRows: [apSix],
    });
    expect(firstYear.map((r) => r.code)).not.toContain("AP-6");
    const otherSem = subjectsForSectionPlot({
      programCode: "BSIT",
      yearLevel: 4,
      termSemester: 2,
      catalogRows: [apSix],
    });
    expect(otherSem.map((r) => r.code)).not.toContain("AP-6");
  });

  it("does not duplicate a code the prospectus already carries", () => {
    const rows = subjectsForSectionPlot({
      programCode: "BSIT",
      yearLevel: 1,
      termSemester: 1,
      catalogRows: [{ ...catalogOnly[0]!, code: "CC-112", yearLevel: 1, semester: 1 }],
    });
    expect(rows.filter((r) => r.code === "CC-112")).toHaveLength(1);
  });

  it("keeps a real lec/lab twin pair even when the catalog copy drops the lab", () => {
    const shadowed: ProspectusSubjectRow[] = [
      { ...catalogOnly[0]!, code: "CC-112", labUnits: 0, labHours: 0 },
    ];
    // CC-112L is a separate code, so the pair still resolves from the codes themselves.
    expect(lecLabModesAvailable("BSIT", "CC-112", shadowed)).toEqual(["lec", "lab"]);
    expect(resolveSubjectCodeForLecLabMode("BSIT", "CC-112", "lab", shadowed)).toBe("CC-112L");
  });

  /**
   * The bug the chairman reported: AP-6 ships in the BSIT prospectus as lecture-only, and adding lab
   * units to it in Subject Codes had no effect on the evaluator at all.
   */
  it("lets a Subject Codes edit override the hardcoded prospectus row", () => {
    // What the prospectus says on its own.
    expect(lecLabModesAvailable("BSIT", "AP-6")).toEqual(["lec"]);

    const edited: ProspectusSubjectRow[] = [
      {
        code: "AP-6",
        title: "Cross-Platform Script Development Technology",
        lecUnits: 3,
        lecHours: 2,
        labUnits: 3,
        labHours: 3,
        yearLevel: 4,
        semester: 1,
      },
    ];
    expect(lecLabModesAvailable("BSIT", "AP-6", edited)).toEqual(["lec", "lab"]);
    expect(subjectRowFor("BSIT", "AP-6", edited)?.labHours).toBe(3);

    const rows = subjectsForSectionPlot({
      programCode: "BSIT",
      yearLevel: 4,
      termSemester: 1,
      catalogRows: edited,
    });
    expect(rows.find((r) => r.code === "AP-6")?.labUnits).toBe(3);
  });

  it("keeps a prospectus subject whose catalog row has a blank semester", () => {
    // catalogSubjectsToProspectusRows turns a null semester into 1; a 2nd-semester prospectus
    // subject must not vanish from the dropdown because of that.
    const rows = subjectsForSectionPlot({
      programCode: "BSIT",
      yearLevel: 1,
      termSemester: 2,
      catalogRows: [
        { ...catalogOnly[0]!, code: "AP-2", yearLevel: 1, semester: 1, labUnits: 4, labHours: 6 },
      ],
    });
    const apTwo = rows.find((r) => r.code === "AP-2");
    expect(apTwo).toBeDefined();
    // ...and it is the catalog's version that survives.
    expect(apTwo?.labUnits).toBe(4);
  });
});
