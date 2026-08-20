"use client";

import { Suspense } from "react";
import { EvaluatorPage } from "@/components/evaluator/EvaluatorPage";

export default function CasEvaluatorPage() {
  return (
    <Suspense fallback={<div className="px-8 py-12 text-sm text-black/60">Loading Central Hub Evaluator…</div>}>
      <EvaluatorPage variant="cas" />
    </Suspense>
  );
}
