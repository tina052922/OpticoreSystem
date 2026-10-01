import { describe, expect, it } from "vitest";
import { gecPlottableSubjectIds, gecSubjectsForSectionPlot } from "./gec-plottable-subjects";

/** A catalog as it really looks: GEC rows seeded under BSIT, none under BACOMM. */
const subjects = [
  { id: "s-gec1-bsit", code: "GEC-1", programId: "prog-bsit" },
  { id: "s-gec2-bsit", code: "GEC-2", programId: "prog-bsit" },
  { id: "s-gee3-bsit", code: "GEE-3", programId: "prog-bsit" },
  { id: "s-gec1-envs", code: "GEC-1", programId: "prog-bsenvs" },
  { id: "s-major-bsit", code: "IT-211", programId: "prog-bsit" },
  { id: "s-major-comm", code: "COMM-101", programId: "prog-bacomm" },
];

describe("gecSubjectsForSectionPlot", () => {
  it("offers only GEC and GEE subjects", () => {
    const codes = gecSubjectsForSectionPlot(subjects, { sectionProgramId: "prog-bsit" }).map(
      (s) => s.code,
    );
    expect(codes).not.toContain("IT-211");
    expect(codes).not.toContain("COMM-101");
  });

  /**
   * The bug this exists for. BACOMM has no GEC rows of its own, and the list was filtered to the
   * section's own program — so the chairman could select a BACOMM section and plot nothing into it.
   */
  it("still offers GEC subjects to a program that has none of its own", () => {
    const codes = gecSubjectsForSectionPlot(subjects, { sectionProgramId: "prog-bacomm" }).map(
      (s) => s.code,
    );
    expect(codes).toEqual(["GEC-1", "GEC-2", "GEE-3"]);
  });

  it("prefers the section's own program's row for a shared code", () => {
    // GEC-1 exists under both; a BSENVS section should get the BSENVS row.
    const picked = gecSubjectsForSectionPlot(subjects, { sectionProgramId: "prog-bsenvs" }).find(
      (s) => s.code === "GEC-1",
    );
    expect(picked?.id).toBe("s-gec1-envs");

    const forBsit = gecSubjectsForSectionPlot(subjects, { sectionProgramId: "prog-bsit" }).find(
      (s) => s.code === "GEC-1",
    );
    expect(forBsit?.id).toBe("s-gec1-bsit");
  });

  it("lists a code once even when several programs carry it", () => {
    const codes = gecSubjectsForSectionPlot(subjects, { sectionProgramId: "prog-bacomm" }).map(
      (s) => s.code,
    );
    expect(codes.filter((c) => c === "GEC-1")).toHaveLength(1);
  });

  it("narrows to the prospectus codes when the prospectus has some", () => {
    const codes = gecSubjectsForSectionPlot(subjects, {
      sectionProgramId: "prog-bsit",
      allowedProspectusCodes: new Set(["GEC1", "GEC2"]),
    }).map((s) => s.code);
    expect(codes).toEqual(["GEC-1", "GEC-2"]);
  });

  /**
   * An empty set means the prospectus had nothing to say — the program is not in the registry, or
   * the section name carried no year level. That is not the same as "nothing is allowed".
   */
  it("offers everything when the prospectus named nothing", () => {
    for (const allowedProspectusCodes of [new Set<string>(), null, undefined]) {
      const codes = gecSubjectsForSectionPlot(subjects, {
        sectionProgramId: "prog-bsit",
        allowedProspectusCodes,
      }).map((s) => s.code);
      expect(codes).toEqual(["GEC-1", "GEC-2", "GEE-3"]);
    }
  });

  it("falls back rather than empty when no catalog row backs the prospectus codes", () => {
    const codes = gecSubjectsForSectionPlot(subjects, {
      sectionProgramId: "prog-bsit",
      allowedProspectusCodes: new Set(["GEC99"]),
    }).map((s) => s.code);
    expect(codes).toEqual(["GEC-1", "GEC-2", "GEE-3"]);
  });

  it("matches a prospectus code to a catalog code punctuated differently", () => {
    // The registry writes "GEC 10", the catalog "GEC-10"; both normalize to GEC10.
    const codes = gecSubjectsForSectionPlot([{ id: "x", code: "GEC-10", programId: "p" }], {
      sectionProgramId: "p",
      allowedProspectusCodes: new Set(["GEC10"]),
    }).map((s) => s.code);
    expect(codes).toEqual(["GEC-10"]);
  });

  it("is empty only when the catalog holds no GEC subject at all", () => {
    expect(
      gecSubjectsForSectionPlot([{ id: "m", code: "IT-211", programId: "prog-bsit" }], {
        sectionProgramId: "prog-bsit",
      }),
    ).toEqual([]);
  });

  it("works when the section's program is unknown", () => {
    const codes = gecSubjectsForSectionPlot(subjects, { sectionProgramId: null }).map((s) => s.code);
    expect(codes).toEqual(["GEC-1", "GEC-2", "GEE-3"]);
  });

  it("picks the same row on every call", () => {
    // Render-to-render stability: a different winner each time would reset the dropdown.
    const once = gecSubjectsForSectionPlot(subjects, { sectionProgramId: "prog-bacomm" });
    const twice = gecSubjectsForSectionPlot([...subjects].reverse(), {
      sectionProgramId: "prog-bacomm",
    });
    expect(once.map((s) => s.id)).toEqual(twice.map((s) => s.id));
  });
});

describe("gecPlottableSubjectIds", () => {
  it("gives the same set by id", () => {
    const ids = gecPlottableSubjectIds(subjects, { sectionProgramId: "prog-bacomm" });
    // GEC-1 is carried by two programs and neither is BACOMM's, so the tie-break picks one.
    expect(ids.has("s-gec1-envs")).toBe(true);
    expect(ids.has("s-gec2-bsit")).toBe(true);
    expect(ids.has("s-major-comm")).toBe(false);
    expect(ids.size).toBe(3);
  });
});
