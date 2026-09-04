import { describe, expect, it } from "vitest";
import {
  isFacultyInsPortal,
  isInsReadOnlyPortal,
  isStudentInsPortal,
  portalMyScheduleHref,
  showInsFacultyGrouping,
} from "./schedule-visibility";

describe("schedule visibility", () => {
  it("locks faculty and student shells as read-only portals", () => {
    expect(isFacultyInsPortal("/faculty/ins")).toBe(true);
    expect(isStudentInsPortal("/student/ins")).toBe(true);
    expect(isInsReadOnlyPortal("/faculty/ins")).toBe(true);
    expect(isInsReadOnlyPortal("/student/ins")).toBe(true);
    expect(isInsReadOnlyPortal("/chairman/ins")).toBe(false);
    expect(isInsReadOnlyPortal("/doi/ins")).toBe(false);
  });

  it("hides faculty personal-schedule grouping from students", () => {
    expect(showInsFacultyGrouping("/student/ins")).toBe(false);
    expect(showInsFacultyGrouping("/faculty/ins")).toBe(true);
    expect(showInsFacultyGrouping("/doi/ins")).toBe(true);
    expect(showInsFacultyGrouping("/chairman/ins")).toBe(true);
  });

  it("points My schedule at the matching portal", () => {
    expect(portalMyScheduleHref("/student/ins")).toBe("/student/schedule");
    expect(portalMyScheduleHref("/faculty/ins")).toBe("/faculty/schedule");
  });
});
