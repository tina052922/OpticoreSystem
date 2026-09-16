import { describe, expect, it } from "vitest";
import {
  formatPlotSubjectDropdownLabel,
  getLecLabPair,
  inferLecLabMode,
  lecLabModesAvailable,
  resolveSubjectCodeForLecLabMode,
  subjectRowsForPlotDropdown,
} from "@/lib/evaluator/chairman-plot-leclab";
import { getProspectusSubjectsForProgram } from "@/lib/chairman/prospectus-registry";
import { normalizePlotRow } from "@/lib/evaluator/chairman-plot-row";

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
        day: "Mon",
      },
      "BSIT",
    );
    expect(row.lecLabMode).toBe("lab");
  });
});
