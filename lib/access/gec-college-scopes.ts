import type { AccessScope } from "@/types/db";

/** One GEC Request Access grant covers Evaluator, INS views, and vacant GEC plotting for that college. */
export const GEC_COLLEGE_ACCESS_SCOPES: AccessScope[] = [
  "evaluator",
  "ins_forms",
  "gec_vacant_slots",
];
