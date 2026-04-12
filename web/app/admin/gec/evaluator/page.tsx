"use client";

import { Suspense } from "react";
import { GecCentralHubEvaluatorClient } from "@/components/gec/GecCentralHubEvaluatorClient";

/**
 * GEC Chairman: college tiles → full per-college schedule; vacant GEC rows editable after one-time
 * College Admin approval (`gec_vacant_slots`).
 */
export default function GecChairmanEvaluatorPage() {
  return (
    <Suspense
      fallback={<div className="px-8 py-12 text-sm text-black/60">Loading Central Hub Evaluator…</div>}
    >
      <GecCentralHubEvaluatorClient />
    </Suspense>
  );
}
