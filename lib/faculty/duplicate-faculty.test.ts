import { describe, expect, it } from "vitest";
import {
  DUPLICATE_FACULTY_MESSAGE,
  duplicateFacultyReason,
  MISSING_EMPLOYEE_ID_MESSAGE,
} from "./duplicate-faculty";

/** The faculty being edited, as the three lookups return them. */
const editing = {
  editingUserId: "u1",
  employeeId: "EMP-1",
  usersWithEmployeeId: [{ id: "u1" }],
  collegeInstructors: [
    { id: "u1", name: "Juan Santos" },
    { id: "u2", name: "Ana Abad" },
  ],
  profiles: [
    { userId: "u1", fullName: "Juan Santos" },
    { userId: "u2", fullName: "Ana Abad" },
  ],
  fullName: "Juan Santos",
};

describe("duplicateFacultyReason while editing", () => {
  it("does not report the record being edited as a duplicate of itself", () => {
    expect(duplicateFacultyReason(editing)).toBeNull();
  });

  it("still allows an edit that only changes other fields", () => {
    expect(duplicateFacultyReason({ ...editing, fullName: "Juan Miguel Santos" })).toBeNull();
  });

  it("reports another faculty holding the same Employee ID", () => {
    expect(
      duplicateFacultyReason({ ...editing, usersWithEmployeeId: [{ id: "u1" }, { id: "u2" }] }),
    ).toBe(DUPLICATE_FACULTY_MESSAGE);
  });

  it("reports a rename onto another instructor's name", () => {
    expect(duplicateFacultyReason({ ...editing, fullName: "Ana Abad" })).toBe(DUPLICATE_FACULTY_MESSAGE);
  });

  it("reports a rename onto another faculty's profile name", () => {
    expect(
      duplicateFacultyReason({
        ...editing,
        collegeInstructors: [{ id: "u1", name: "Juan Santos" }],
        profiles: [
          { userId: "u1", fullName: "Juan Santos" },
          { userId: "u3", fullName: "Maria Reyes" },
        ],
        fullName: "Maria Reyes",
      }),
    ).toBe(DUPLICATE_FACULTY_MESSAGE);
  });
});

describe("duplicateFacultyReason while adding", () => {
  const adding = { ...editing, editingUserId: null, usersWithEmployeeId: [] };

  it("passes for a new name and a free Employee ID", () => {
    expect(duplicateFacultyReason({ ...adding, fullName: "Maria Reyes" })).toBeNull();
  });

  it("catches a taken Employee ID", () => {
    expect(duplicateFacultyReason({ ...adding, usersWithEmployeeId: [{ id: "u2" }] })).toBe(
      DUPLICATE_FACULTY_MESSAGE,
    );
  });

  it("catches an existing name, case- and spacing-insensitively", () => {
    expect(duplicateFacultyReason({ ...adding, fullName: "  ana   abad " })).toBe(
      DUPLICATE_FACULTY_MESSAGE,
    );
  });

  it("requires an Employee ID", () => {
    expect(duplicateFacultyReason({ ...adding, employeeId: "  " })).toBe(MISSING_EMPLOYEE_ID_MESSAGE);
  });

  it("ignores profiles with no stored name", () => {
    expect(
      duplicateFacultyReason({
        ...adding,
        collegeInstructors: [],
        profiles: [{ userId: "u9", fullName: null }],
        fullName: "Maria Reyes",
      }),
    ).toBeNull();
  });
});
