"use client";

import { Suspense } from "react";
import { EvaluatorPage } from "@/components/evaluator/EvaluatorPage";

/**
 * GEC Chairman: same Central Hub Evaluator view as CAS/College (campus-wide tiles + hub table).
 * Editing vacant GEC cells still requires College Admin approval on the Vacant GEC slots flow.
 */
export default function GecChairmanEvaluatorPage() {
  return (
    <Suspense
      fallback={<div className="px-8 py-12 text-sm text-black/60">Loading Central Hub Evaluator…</div>}
    >
      <EvaluatorPage variant="gec" />
    </Suspense>
  );
}
