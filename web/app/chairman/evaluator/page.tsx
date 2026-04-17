import { Suspense } from "react";
import { redirect } from "next/navigation";
import { EvaluatorPage } from "@/components/evaluator/EvaluatorPage";
import { getChairmanSession } from "@/lib/auth/chairman-session";

export default async function ChairmanEvaluatorPage() {
  const session = await getChairmanSession();
  if (!session) redirect("/login");

  return (
    <Suspense fallback={<div className="px-8 py-12 text-sm text-black/60">Loading Evaluator…</div>}>
      <EvaluatorPage
        variant="chairman"
        chairmanCollegeId={session.collegeId}
        chairmanProgramId={session.programId}
        chairmanProgramCode={session.programCode}
        chairmanProgramName={session.programName}
      />
    </Suspense>
  );
}
