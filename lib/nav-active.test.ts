import { describe, expect, it } from "vitest";
import { isNavItemActive } from "./nav-active";

describe("isNavItemActive", () => {
  const collegeNav = [
    "/admin/college",
    "/admin/college/evaluator",
    "/admin/college/audit-log",
    "/admin/college/ins",
  ];

  it("activates exact match when no child route is more specific", () => {
    expect(isNavItemActive("/admin/college", "/admin/college", collegeNav)).toBe(true);
  });

  it("does not activate parent when a longer nav href matches", () => {
    expect(isNavItemActive("/admin/college/evaluator", "/admin/college", collegeNav)).toBe(false);
  });

  it("activates the most specific nested href", () => {
    expect(isNavItemActive("/admin/college/evaluator", "/admin/college/evaluator", collegeNav)).toBe(true);
  });

  it("returns false when pathname does not match href", () => {
    expect(isNavItemActive("/login", "/admin/college", collegeNav)).toBe(false);
  });

  const instructorNav = [
    "/faculty",
    "/faculty/schedule",
    "/faculty/ins?tab=faculty",
    "/faculty/announcements",
    "/campus-navigation",
  ];

  it("treats /faculty as exact-only so INS and other child routes do not highlight Campus Intelligence", () => {
    expect(isNavItemActive("/faculty", "/faculty", instructorNav)).toBe(true);
    expect(isNavItemActive("/faculty/ins", "/faculty", instructorNav)).toBe(false);
    expect(isNavItemActive("/faculty/ins", "/faculty/ins?tab=faculty", instructorNav)).toBe(true);
    expect(isNavItemActive("/faculty/ins", "/faculty/ins?tab=section", instructorNav)).toBe(true);
    expect(isNavItemActive("/faculty/schedule", "/faculty/schedule", instructorNav)).toBe(true);
    expect(isNavItemActive("/faculty/profile", "/faculty", instructorNav)).toBe(false);
  });

  const studentNav = [
    "/student",
    "/student/schedule",
    "/student/ins?tab=section",
    "/student/profile",
    "/campus-navigation",
  ];

  it("treats /student as exact-only so nested portal routes do not highlight Dashboard", () => {
    expect(isNavItemActive("/student", "/student", studentNav)).toBe(true);
    expect(isNavItemActive("/student/ins", "/student", studentNav)).toBe(false);
    expect(isNavItemActive("/student/ins", "/student/ins?tab=section", studentNav)).toBe(true);
    expect(isNavItemActive("/student/ins", "/student/ins?tab=room", studentNav)).toBe(true);
    expect(isNavItemActive("/student/schedule", "/student/schedule", studentNav)).toBe(true);
    expect(isNavItemActive("/student/schedule", "/student", studentNav)).toBe(false);
  });
});
