"use client";

import { Suspense } from "react";
import { GecCentralHubEvaluatorClient } from "@/components/gec/GecCentralHubEvaluatorClient";

/** GEC Chairman: college tiles → Central Hub Evaluator; vacant GEC rows editable per college after College Admin approval. */
export default function GecChairmanEvaluatorPage() {
  return (
    <Suspense
      fallback={<div className="px-8 py-12 text-sm text-black/60">Loading Central Hub Evaluator…</div>}
    >
      <GecCentralHubEvaluatorClient />
    </Suspense>
  );
}
