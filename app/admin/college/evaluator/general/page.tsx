import { redirect } from "next/navigation";
import { Suspense } from "react";
import { GecCentralHubEvaluatorClient } from "@/components/gec/GecCentralHubEvaluatorClient";
import { CasPlottingScopeSelect } from "@/components/evaluator/CasPlottingScopeSelect";
import { requireRoles } from "@/lib/auth/require-role";

/**
 * Subject Scheduler with "Plotting: General subjects (all colleges)" (CAS College Admin only): plot
 * general subjects into other colleges' vacant slots, like the Service Chairs. What other colleges
 * plotted stays read-only (server-enforced).
 */
export default async function CasGeneralSubjectsSchedulerPage() {
  const profile = await requireRoles(["college_admin"]);
  if (!profile.casAdmin) redirect("/admin/college/evaluator");
  return (
    <Suspense fallback={<div className="px-8 py-12 text-sm text-black/60">Loading the scheduler…</div>}>
      <GecCentralHubEvaluatorClient casAdmin headerActions={<CasPlottingScopeSelect active="general" />} />
    </Suspense>
  );
}
