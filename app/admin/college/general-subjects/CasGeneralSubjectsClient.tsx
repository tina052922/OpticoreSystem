"use client";

import { Suspense } from "react";
import { GecCentralHubEvaluatorClient } from "@/components/gec/GecCentralHubEvaluatorClient";

export function CasGeneralSubjectsClient() {
  return (
    <Suspense fallback={<div className="px-8 py-12 text-sm text-black/60">Loading the scheduler…</div>}>
      <GecCentralHubEvaluatorClient casAdmin />
    </Suspense>
  );
}
