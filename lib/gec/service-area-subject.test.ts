import { afterEach, describe, expect, it } from "vitest";
import { isServiceAreaSubject, setActiveServiceAreaCode, setAnyGeneralSubjectScope } from "./gec-vacant";

afterEach(() => {
  setActiveServiceAreaCode(null);
  setAnyGeneralSubjectScope(false);
});

describe("isServiceAreaSubject", () => {
  it("Service Chair: any general subject, never a program subject", () => {
    setActiveServiceAreaCode("pe");
    expect(isServiceAreaSubject({ code: "PE 1", subjectArea: "pe" })).toBe(true);
    expect(isServiceAreaSubject({ code: "GEC-MMW", subjectArea: "nsm" })).toBe(true);
    expect(isServiceAreaSubject({ code: "GEE-PPC", subjectArea: null })).toBe(true);
    // Not strict: another area's subject is a general subject too.
    expect(isServiceAreaSubject({ code: "HPC 111", subjectArea: "hss" })).toBe(true);
    expect(isServiceAreaSubject({ code: "PATHFit 2", category: "pe" })).toBe(true);
    expect(isServiceAreaSubject({ code: "CC-111", subjectArea: null })).toBe(false);
  });
  it("CAS College Admin: every general subject, never a major", () => {
    setAnyGeneralSubjectScope(true);
    expect(isServiceAreaSubject({ code: "GEC-PC", subjectArea: null })).toBe(true);
    expect(isServiceAreaSubject({ code: "PE 1", subjectArea: "pe" })).toBe(true);
    expect(isServiceAreaSubject({ code: "CC121", subjectArea: null })).toBe(false);
  });
  it("Others: the original GEC-/GEE- rule", () => {
    expect(isServiceAreaSubject({ code: "GEC-PC" })).toBe(true);
    expect(isServiceAreaSubject({ code: "PE 1", subjectArea: "pe" })).toBe(false);
  });
});
