import { describe, expect, it } from "vitest";
import { isNavItemActive } from "./nav-active";

describe("isNavItemActive", () => {
  const collegeNav = [
    "/admin/college",
    "/admin/college/evaluator",
    "/admin/college/audit-log",
    "/admin/college/ins/faculty",
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
});
