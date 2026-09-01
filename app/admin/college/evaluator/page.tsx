import { Suspense } from "react";
import { EvaluatorPage } from "@/components/evaluator/EvaluatorPage";
import { requireRoles } from "@/lib/auth/require-role";

export default async function CollegeEvaluatorPage() {
  const profile = await requireRoles(["college_admin"]);

  return (
    <Suspense fallback={<div className="px-8 py-12 text-sm text-black/60">Loading Evaluator…</div>}>
      <EvaluatorPage variant="college" chairmanCollegeId={profile.collegeId} />
    </Suspense>
  );
}
