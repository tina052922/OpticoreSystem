import { describe, expect, it } from "vitest";
import { isFacultyVisibleToRosterViewer } from "./faculty-roster-visibility";

const serviceChair = { id: "s1", role: "gec_chairman" as const, facultyCategory: null, chairmanProgramId: null };
const gecInstructor = { id: "g1", role: "instructor" as const, facultyCategory: "gec", chairmanProgramId: null, instructorValidation: "active" };

describe("College Admin faculty list — Service Chairs", () => {
  it("are hidden from an ordinary College Admin", () => {
    expect(isFacultyVisibleToRosterViewer(serviceChair, { excludeGec: true })).toBe(false);
  });
  it("are listed for the CAS Admin", () => {
    expect(isFacultyVisibleToRosterViewer(serviceChair, { excludeGec: true, includeServiceChairs: true })).toBe(true);
  });
  it("does not bring in other General Subject instructors", () => {
    expect(isFacultyVisibleToRosterViewer(gecInstructor, { excludeGec: true, includeServiceChairs: true })).toBe(false);
  });
});
