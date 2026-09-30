import { describe, expect, it } from "vitest";
import { isAwaitingFacultyApproval, isFacultyRosterUser } from "./faculty-roster-visibility";
import { isPlottableFacultyUser } from "@/lib/auth/instructor-validation";

const instructor = (instructorValidation: string | null) =>
  ({ role: "instructor" as const, instructorValidation });

describe("isFacultyRosterUser", () => {
  it("lists an approved instructor", () => {
    expect(isFacultyRosterUser(instructor("active"))).toBe(true);
    // A blank column has always meant active.
    expect(isFacultyRosterUser(instructor(null))).toBe(true);
    expect(isFacultyRosterUser(instructor(""))).toBe(true);
  });

  /**
   * The bug this exists for. A self-registration writes a FacultyProfile immediately but leaves the
   * account pending, so filtering the roster by plottability hid the very profile that needed
   * reviewing.
   */
  it("lists a self-registration still awaiting approval", () => {
    expect(isFacultyRosterUser(instructor("pending"))).toBe(true);
    // ...which is exactly where it differs from the scheduling rule.
    expect(isPlottableFacultyUser({ role: "instructor", instructorValidation: "pending" })).toBe(false);
  });

  it("leaves a rejected registration off — that is not faculty", () => {
    expect(isFacultyRosterUser(instructor("rejected"))).toBe(false);
  });

  it("is case and whitespace insensitive about the stored value", () => {
    expect(isFacultyRosterUser(instructor(" PENDING "))).toBe(true);
    expect(isFacultyRosterUser(instructor(" Rejected "))).toBe(false);
  });

  it("does not put admin accounts on the faculty roster", () => {
    for (const role of ["chairman_admin", "gec_chairman", "college_admin", "doi_admin", "student"] as const) {
      expect(isFacultyRosterUser({ role, instructorValidation: "active" })).toBe(false);
    }
  });
});

describe("isAwaitingFacultyApproval", () => {
  it("marks only a pending account", () => {
    expect(isAwaitingFacultyApproval(instructor("pending"))).toBe(true);
    expect(isAwaitingFacultyApproval(instructor("active"))).toBe(false);
    expect(isAwaitingFacultyApproval(instructor(null))).toBe(false);
    expect(isAwaitingFacultyApproval(instructor("rejected"))).toBe(false);
  });
});
