import { describe, expect, it } from "vitest";
import { isSubjectSchedulerPath } from "./subject-scheduler-route";

describe("isSubjectSchedulerPath", () => {
  it("matches every role's Subject Scheduler", () => {
    for (const p of [
      "/chairman/evaluator",
      "/admin/college/evaluator",
      "/admin/college/evaluator/general",
      "/admin/cas/evaluator",
      "/admin/gec/evaluator",
      "/doi/evaluator",
    ]) {
      expect(isSubjectSchedulerPath(p)).toBe(true);
    }
  });

  it("rejects other pages", () => {
    for (const p of ["/chairman/ins", "/admin/college/teaching-load-summary", "/doi/evaluators", "", null]) {
      expect(isSubjectSchedulerPath(p)).toBe(false);
    }
  });
});
