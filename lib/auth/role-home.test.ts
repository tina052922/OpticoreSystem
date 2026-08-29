import { describe, expect, it } from "vitest";
import { getDefaultHomeForRole, pathAllowedForRole } from "./role-home";

describe("role home", () => {
  it("sends college admin to the college admin shell, not chairman or student", () => {
    expect(getDefaultHomeForRole("college_admin")).toBe("/admin/college");
    expect(pathAllowedForRole("college_admin", "/student")).toBe(false);
    expect(pathAllowedForRole("college_admin", "/chairman")).toBe(false);
    expect(pathAllowedForRole("college_admin", "/admin/college")).toBe(true);
  });

  it("keeps student on the student portal", () => {
    expect(getDefaultHomeForRole("student")).toBe("/student");
    expect(pathAllowedForRole("student", "/admin/college")).toBe(false);
    expect(pathAllowedForRole("student", "/student/profile")).toBe(true);
  });
});
