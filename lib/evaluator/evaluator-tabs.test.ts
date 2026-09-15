import { describe, expect, it } from "vitest";
import { EVALUATOR_TAB_LABELS } from "./evaluator-tabs";

describe("EVALUATOR_TAB_LABELS", () => {
  it("keeps stable wording for all Evaluator shells", () => {
    expect(EVALUATOR_TAB_LABELS.colleges).toBe("Colleges");
    expect(EVALUATOR_TAB_LABELS.timetabling).toBe("Timetabling & Optimization");
    expect(EVALUATOR_TAB_LABELS.hrs).toBe("Hrs · Units · Preps · Remarks");
  });
});
