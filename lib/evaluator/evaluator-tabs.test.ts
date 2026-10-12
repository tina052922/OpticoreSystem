import { describe, expect, it } from "vitest";
import { EVALUATOR_TAB_LABELS } from "./evaluator-tabs";

describe("EVALUATOR_TAB_LABELS", () => {
  it("keeps stable wording for all Evaluator shells", () => {
    expect(EVALUATOR_TAB_LABELS.colleges).toBe("Colleges");
    expect(EVALUATOR_TAB_LABELS.timetabling).toBe("Timetabling & Optimization");
    // The Hrs tab was removed; those totals are the Summary of Teaching Load's own page.
    expect(Object.keys(EVALUATOR_TAB_LABELS)).toEqual(["colleges", "timetabling"]);
  });
});
