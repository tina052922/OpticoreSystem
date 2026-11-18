import { afterEach, describe, expect, it } from "vitest";
import { isServiceAreaSubject, setActiveServiceAreaCode, setAnyGeneralSubjectScope } from "./gec-vacant";

afterEach(() => {
  setActiveServiceAreaCode(null);
  setAnyGeneralSubjectScope(false);
});

describe("isServiceAreaSubject", () => {
  it("Service Chair: only subjects tagged with their area", () => {
    setActiveServiceAreaCode("pe");
    expect(isServiceAreaSubject({ code: "PE 1", subjectArea: "pe" })).toBe(true);
    expect(isServiceAreaSubject({ code: "GEC-MMW", subjectArea: "nsm" })).toBe(false);
    expect(isServiceAreaSubject({ code: "GEC-PC", subjectArea: null })).toBe(false);
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
